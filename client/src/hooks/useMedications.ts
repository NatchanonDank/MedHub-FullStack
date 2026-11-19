import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMedStore } from '../stores/useMedStore';
import {
  fetchMedicationsApi,
  fetchMedicationByIdApi,
  fetchMyKitApi,
  toggleMyKitApi,
  updateMyKitNoteApi,
  clearMyKitApi,
  type Medication,
  type MedicationApiResponse,
  type MyKitItem,
} from '../api/medicationApi';

export type { Medication, MedicationApiResponse, MyKitItem };

// ดึงรายการยาทั้งหมดจาก Backend + PostgreSQL
export const useMedications = () => {
  return useQuery<MedicationApiResponse>({
    queryKey: ['medications'],
    queryFn: fetchMedicationsApi,
    staleTime: 1000 * 60 * 5,
  });
};

// ดึงรายละเอียดยาแต่ละตัวจาก Backend
export const useMedicationDetail = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useQuery<Medication>({
    queryKey: ['medication', id],
    queryFn: () => fetchMedicationByIdApi(id!),
    initialData: () => {
      const medsData = queryClient.getQueryData<MedicationApiResponse>(['medications']);
      return medsData?.results.find((m) => String(m.id) === String(id));
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
};

// จัดการกระเป๋ายาส่วนตัว (CRUD เชื่อมต่อ Database จริง)
export const useMyKit = () => {
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useMedStore();

  const myKitQuery = useQuery<MyKitItem[]>({
    queryKey: ['my-kit', user?.id],
    queryFn: () => fetchMyKitApi(user!.id),
    enabled: !!user?.id,
  });

  const kitItems = myKitQuery.data || [];
  const myKit = kitItems.map((item) => item.medication);

  const isInKit = (medicationId: string | number) =>
    kitItems.some((item) => String(item.medicationId) === String(medicationId));

  const toggleMutation = useMutation({
    mutationFn: ({ medicationId, note }: { medicationId: string; note?: string }) =>
      toggleMyKitApi(user!.id, medicationId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-kit', user?.id] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ itemId, note }: { itemId: number; note: string }) =>
      updateMyKitNoteApi(itemId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-kit', user?.id] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearMyKitApi(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-kit', user?.id] });
    },
  });

  const toggleMyKit = (medOrId: Medication | string | number, note?: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    const medicationId =
      typeof medOrId === 'object' && medOrId !== null ? String(medOrId.id) : String(medOrId);
    toggleMutation.mutate({ medicationId, note });
  };

  const updateItemNote = (itemId: number, note: string) => {
    if (!user) return;
    updateNoteMutation.mutate({ itemId, note });
  };

  const clearKit = () => {
    if (!user) return;
    clearMutation.mutate();
  };

  return {
    kitItems,
    myKit,
    isLoading: myKitQuery.isLoading,
    isToggling: toggleMutation.isPending,
    isInKit,
    toggleMyKit,
    updateItemNote,
    clearKit,
  };
};