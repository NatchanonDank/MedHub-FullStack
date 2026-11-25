import { prisma } from '../lib/prisma';

export interface InteractionCheckResponse {
  status: 'safe' | 'warning' | 'danger';
  ruleName?: string;
  message: string;
}

export async function evaluateDrugInteraction(
  med1Id: string,
  med2Id: string
): Promise<InteractionCheckResponse | null> {
  if (med1Id === med2Id) {
    return {
      status: 'warning',
      message: 'คุณเลือกยาทั้งสองชนิดซ้ำกัน กรุณาเลือกยาที่แตกต่างกันเพื่อตรวจสอบ',
    };
  }

  const [med1, med2, rules] = await Promise.all([
    prisma.medication.findUnique({ where: { id: med1Id } }),
    prisma.medication.findUnique({ where: { id: med2Id } }),
    prisma.drugInteractionRule.findMany({
      orderBy: [{ severity: 'asc' }, { id: 'asc' }],
    }),
  ]);

  if (!med1 || !med2) {
    return null;
  }

  type MedRecord = NonNullable<typeof med1>;

  const matchesGroup = (med: MedRecord, groupTerms: string[], excludeTerms: string[]) => {
    const searchableFields = [med.name, med.genericName, med.brandName, med.category]
      .filter((val): val is string => Boolean(val && val.trim().length > 0))
      .map((val) => val.toLowerCase().trim());

    const isExcluded = excludeTerms.some((ex) => {
      const kw = ex.toLowerCase().trim();
      return kw.length > 0 && searchableFields.some((field) => field.includes(kw));
    });

    if (isExcluded) return false;

    return groupTerms.some((term) => {
      const kw = term.toLowerCase().trim();
      return kw.length > 0 && searchableFields.some((field) => field.includes(kw));
    });
  };

  for (const rule of rules) {
    const forwardMatch =
      matchesGroup(med1, rule.drugAGroup, rule.excludeA) &&
      matchesGroup(med2, rule.drugBGroup, rule.excludeB);

    const reverseMatch =
      matchesGroup(med2, rule.drugAGroup, rule.excludeA) &&
      matchesGroup(med1, rule.drugBGroup, rule.excludeB);

    if (forwardMatch || reverseMatch) {
      return {
        status: rule.severity.toLowerCase() === 'danger' ? 'danger' : 'warning',
        ruleName: rule.ruleName,
        message: rule.message,
      };
    }
  }

  const findDatabaseInteractionDetails = (sourceMed: MedRecord, targetMed: MedRecord): string[] => {
    if (!Array.isArray(sourceMed.interactions) || sourceMed.interactions.length === 0) {
      return [];
    }

    const targetKeywords = [targetMed.name, targetMed.genericName, targetMed.brandName]
      .filter((val): val is string => Boolean(val && val.trim().length > 2))
      .map((val) => val.toLowerCase().trim());

    return sourceMed.interactions.filter((item) =>
      targetKeywords.some((kw) => item.toLowerCase().includes(kw))
    );
  };

  const allDbDetails = Array.from(
    new Set([
      ...findDatabaseInteractionDetails(med1, med2),
      ...findDatabaseInteractionDetails(med2, med1),
    ])
  );

  if (allDbDetails.length > 0) {
    const extraAdvice = [
      ...(Array.isArray(med1.warnings) ? med1.warnings : []),
      ...(Array.isArray(med2.warnings) ? med2.warnings : []),
    ]
      .slice(0, 2)
      .join(' / ');

    return {
      status: 'warning',
      ruleName: 'Database Pharmacological Interaction',
      message: `เฝ้าระวังปฏิกิริยาระหว่างยา (${med1.name} + ${med2.name}): ยาทั้งสองชนิดมีรายงานปฏิกิริยาร่วมกันในฐานข้อมูลเภสัชภัณฑ์ (${allDbDetails.join(' | ')}) ซึ่งอาจเปลี่ยนแปลงการดูดซึม ระดับยาในเลือด หรือเพิ่มผลข้างเคียงของกันและกัน${extraAdvice ? ` — ข้อควรระวังเพิ่มเติม: ${extraAdvice}` : ''} ควรปรึกษาแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน`,
    };
  }

  if (
    med1.category &&
    med2.category &&
    med1.category === med2.category &&
    ['Cardiovascular', 'Psychiatric', 'Antidiabetic', 'Antihistamine'].includes(med1.category)
  ) {
    return {
      status: 'warning',
      message: `เฝ้าระวัง: ยาทั้งสองชนิดอยู่ในหมวดหมู่ ${med1.category} เหมือนกัน อาจเกิดการเสริมฤทธิ์หรือผลข้างเคียงซ้ำซ้อน (เช่น ความดันโลหิตต่ำเกินไป ง่วงซึมรุนแรง หรือน้ำตาลในเลือดต่ำ) ควรใช้ภายใต้คำสั่งแพทย์`,
    };
  }

  return {
    status: 'safe',
    message: `ปลอดภัย: ไม่พบปฏิกิริยารุนแรงระหว่าง ${med1.name} และ ${med2.name} ในระบบเบื้องต้น (ควรรับประทานตามขนาดและวิธีใช้ที่ระบุบนฉลากยา)`,
  };
}