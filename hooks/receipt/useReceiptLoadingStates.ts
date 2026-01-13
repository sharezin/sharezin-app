import { useState, useCallback } from 'react';

interface ReceiptLoadingStates {
  closingReceipt: boolean;
  closingParticipation: boolean;
  acceptingParticipant: string | null;
  rejectingParticipant: string | null;
  closingParticipant: string | null;
  removingParticipant: string | null;
  requestingDeletion: string | null;
  approvingDeletion: string | null;
  rejectingDeletion: string | null;
  deletingItem: string | null;
  transferringCreator: boolean;
}

interface UseReceiptLoadingStatesReturn {
  loading: ReceiptLoadingStates;
  setLoading: (updates: Partial<ReceiptLoadingStates>) => void;
  setLoadingState: <K extends keyof ReceiptLoadingStates>(
    key: K,
    value: ReceiptLoadingStates[K]
  ) => void;
  clearLoading: () => void;
  isLoading: (key: keyof ReceiptLoadingStates) => boolean;
  isAnyLoading: () => boolean;
}

const initialState: ReceiptLoadingStates = {
  closingReceipt: false,
  closingParticipation: false,
  acceptingParticipant: null,
  rejectingParticipant: null,
  closingParticipant: null,
  removingParticipant: null,
  requestingDeletion: null,
  approvingDeletion: null,
  rejectingDeletion: null,
  deletingItem: null,
  transferringCreator: false,
};

export function useReceiptLoadingStates(): UseReceiptLoadingStatesReturn {
  const [loading, setLoadingState] = useState<ReceiptLoadingStates>(initialState);

  const setLoading = useCallback((updates: Partial<ReceiptLoadingStates>) => {
    setLoadingState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setLoadingStateValue = useCallback(
    <K extends keyof ReceiptLoadingStates>(
      key: K,
      value: ReceiptLoadingStates[K]
    ) => {
      setLoadingState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearLoading = useCallback(() => {
    setLoadingState(initialState);
  }, []);

  const isLoading = useCallback(
    (key: keyof ReceiptLoadingStates): boolean => {
      const value = loading[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        return value !== null;
      }
      return false;
    },
    [loading]
  );

  const isAnyLoading = useCallback((): boolean => {
    return (
      loading.closingReceipt ||
      loading.closingParticipation ||
      loading.acceptingParticipant !== null ||
      loading.rejectingParticipant !== null ||
      loading.closingParticipant !== null ||
      loading.removingParticipant !== null ||
      loading.requestingDeletion !== null ||
      loading.approvingDeletion !== null ||
      loading.rejectingDeletion !== null ||
      loading.deletingItem !== null ||
      loading.transferringCreator
    );
  }, [loading]);

  return {
    loading,
    setLoading,
    setLoadingState: setLoadingStateValue,
    clearLoading,
    isLoading,
    isAnyLoading,
  };
}
