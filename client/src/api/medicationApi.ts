import type { AuthUser } from '../stores/useMedStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  brandName?: string | null;
  category: string;
  indications: string[];
  sideEffects: string[];
  warnings: string[];
  interactions: string[];
  strength?: string | null;
  dosageForm?: string | null;
  prescriptionType?: string | null;
  specialTag?: string | null;
  dosageInstruction?: string | null;
  appearance?: string | null;
  pregnancyCategory?: string | null;
  imageUrl?: string | null;
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

const handleResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
  return data as T;
};

// ==========================================
// 1. Medications API
// ==========================================
export const fetchMedicationsApi = async (): Promise<MedicationApiResponse> => {
  const res = await fetch(`${API_BASE_URL}/medications`);
  return handleResponse<MedicationApiResponse>(res);
};

export const fetchMedicationByIdApi = async (id: string): Promise<Medication> => {
  const res = await fetch(`${API_BASE_URL}/medications/${encodeURIComponent(id)}`);
  return handleResponse<Medication>(res);
};

// ==========================================
// 2. Interaction Checker API
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
// 3. Simple Authentication API
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
// 4. Personal Collection (My Kit) CRUD API
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