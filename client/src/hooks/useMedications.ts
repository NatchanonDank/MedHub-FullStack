import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMedStore } from '../stores/useMedStore';
import {
  fetchMedicationsApi,
  fetchMedicationByIdApi,
  createMedication,
  updateMedication,
  deleteMedication,
  fetchMyKitApi,
  toggleMyKitApi,
  updateMyKitNoteApi,
  clearMyKitApi,
  fetchSymptomReports,
  createSymptomReport,
  updateSymptomReport,
  deleteSymptomReport,
  type Medication,
  type MedicationPayload,
  type MedicationApiResponse,
  type MyKitItem,
  type SeverityLevel,
  type ReportStatus,
} from '../api/medicationApi';


// Medications Queries & Admin Mutations

export const useMedications = (
  _search?: string,
  _category?: string,
  _sort?: string
) => {
  return useQuery<MedicationApiResponse>({
    queryKey: ['medications'],
    queryFn: fetchMedicationsApi,
    staleTime: 1000 * 60 * 5,
  });
};

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

export const useCreateMedication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MedicationPayload) => createMedication(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });
};

export const useUpdateMedication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MedicationPayload> }) =>
      updateMedication(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication', variables.id] });
    },
  });
};

export const useDeleteMedication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });
};


// Personal Collection (My Kit) CRUD

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


// Symptom Reports Queries & Mutations

export const useSymptomReports = (userId?: number) => {
  return useQuery({
    queryKey: ['symptom-reports', userId ?? 'all'],
    queryFn: () => fetchSymptomReports(userId),
  });
};

export const useCreateSymptomReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: number;
      medicationId: string;
      symptom: string;
      severity: SeverityLevel;
      description?: string;
    }) => createSymptomReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptom-reports'] });
    },
  });
};

export const useUpdateSymptomReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        medicationId?: string;
        symptom?: string;
        severity?: SeverityLevel;
        description?: string;
        status?: ReportStatus;
        adminNote?: string;
      };
    }) => updateSymptomReport(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptom-reports'] });
    },
  });
};

export const useDeleteSymptomReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSymptomReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptom-reports'] });
    },
  });
};