import type { AuthUser } from '../stores/useMedStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ==========================================
// 1. Interfaces & Types
// ==========================================
export interface Medication {
  id: string;
  name: string;
  genericName: string;
  brandName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  category: string;
  prescriptionType?: string | null;
  specialTag?: string | null;
  dosageInstruction?: string | null;
  appearance?: string | null;
  indications: string[];
  sideEffects: string[];
  warnings: string[];
  interactions: string[];
  pregnancyCategory?: string | null;
  imageUrl?: string | null;
}

export interface MedicationPayload {
  name: string;
  genericName: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  category: string;
  prescriptionType?: string;
  specialTag?: string;
  dosageInstruction?: string;
  appearance?: string;
  indications: string[];
  sideEffects: string[];
  warnings: string[];
  interactions: string[];
  pregnancyCategory?: string;
  imageUrl?: string;
}

export interface MedicationApiResponse {
  count: number;
  results: Medication[];
}

export interface MyKitItem {
  id: number;
  userId: number;
  medicationId: string;
  note: string;
  createdAt: string;
  medication: Medication;
}

export interface InteractionResult {
  status: 'safe' | 'warning' | 'danger';
  message: string;
}

export type SeverityLevel = 'MILD' | 'MODERATE' | 'SEVERE';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED';

export interface SymptomReport {
  id: number;
  userId: number;
  medicationId: string;
  symptom: string;
  severity: SeverityLevel;
  description?: string | null;
  status: ReportStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  medication: {
    id: string;
    name: string;
    genericName: string;
    category: string;
    imageUrl?: string | null;
  };
}

const handleResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
  return data as T;
};

// ==========================================
// 2. Medications Full CRUD API
// ==========================================
export const fetchMedicationsApi = async (): Promise<MedicationApiResponse> => {
  const res = await fetch(`${API_BASE_URL}/medications`);
  return handleResponse<MedicationApiResponse>(res);
};

export const fetchMedicationByIdApi = async (id: string): Promise<Medication> => {
  const res = await fetch(`${API_BASE_URL}/medications/${encodeURIComponent(id)}`);
  return handleResponse<Medication>(res);
};

export const createMedication = async (payload: MedicationPayload): Promise<Medication> => {
  const res = await fetch(`${API_BASE_URL}/medications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Medication>(res);
};

export const updateMedication = async (
  id: string,
  payload: Partial<MedicationPayload>
): Promise<Medication> => {
  const res = await fetch(`${API_BASE_URL}/medications/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Medication>(res);
};

export const deleteMedication = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/medications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
};

// ==========================================
// 3. Interaction Checker API
// ==========================================
export const checkInteractionApi = async (
  med1Id: string,
  med2Id: string
): Promise<InteractionResult> => {
  const res = await fetch(`${API_BASE_URL}/interactions/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ med1Id, med2Id }),
  });
  return handleResponse<InteractionResult>(res);
};

// ==========================================
// 4. Authentication API
// ==========================================
export const loginApi = async (email: string, password: string): Promise<{ user: AuthUser }> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ user: AuthUser }>(res);
};

export const registerApi = async (
  email: string,
  name: string,
  password: string
): Promise<{ user: AuthUser }> => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  return handleResponse<{ user: AuthUser }>(res);
};

// ==========================================
// 5. Personal Collection (My Kit) CRUD API
// ==========================================
export const fetchMyKitApi = async (userId: number): Promise<MyKitItem[]> => {
  const res = await fetch(`${API_BASE_URL}/my-kit/${userId}`);
  return handleResponse<MyKitItem[]>(res);
};

export const toggleMyKitApi = async (
  userId: number,
  medicationId: string,
  note?: string
): Promise<{ action: 'added' | 'removed'; item?: MyKitItem; medicationId?: string }> => {
  const res = await fetch(`${API_BASE_URL}/my-kit/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, medicationId, note }),
  });
  return handleResponse(res);
};

export const updateMyKitNoteApi = async (itemId: number, note: string): Promise<MyKitItem> => {
  const res = await fetch(`${API_BASE_URL}/my-kit/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  return handleResponse<MyKitItem>(res);
};

export const clearMyKitApi = async (userId: number): Promise<{ message: string }> => {
  const res = await fetch(`${API_BASE_URL}/my-kit/${userId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ message: string }>(res);
};

// ==========================================
// 6. Symptom Reports CRUD API (User & Admin)
// ==========================================
export const fetchSymptomReports = async (userId?: number): Promise<SymptomReport[]> => {
  const url = userId ? `${API_BASE_URL}/reports?userId=${userId}` : `${API_BASE_URL}/reports`;
  const res = await fetch(url);
  return handleResponse<SymptomReport[]>(res);
};

export const createSymptomReport = async (payload: {
  userId: number;
  medicationId: string;
  symptom: string;
  severity: SeverityLevel;
  description?: string;
}): Promise<SymptomReport> => {
  const res = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SymptomReport>(res);
};

export const updateSymptomReport = async (
  id: number,
  payload: {
    medicationId?: string;
    symptom?: string;
    severity?: SeverityLevel;
    description?: string;
    status?: ReportStatus;
    adminNote?: string;
  }
): Promise<SymptomReport> => {
  const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SymptomReport>(res);
};

export const deleteSymptomReport = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
};