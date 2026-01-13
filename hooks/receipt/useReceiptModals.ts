import { useState, useCallback } from 'react';

interface ReceiptModalsState {
  productForm: boolean;
  inviteCode: boolean;
  userSummary: boolean;
  transferCreator: boolean;
  participantReceipt: boolean;
  deleteItem: {
    isOpen: boolean;
    itemId: string | null;
  };
  closeReceipt: boolean;
  closeParticipation: boolean;
  removeParticipant: {
    isOpen: boolean;
    participantId: string | null;
  };
}

interface UseReceiptModalsReturn {
  modals: ReceiptModalsState;
  openModal: (modal: keyof ReceiptModalsState, value?: any) => void;
  closeModal: (modal: keyof ReceiptModalsState) => void;
  closeAllModals: () => void;
}

const initialState: ReceiptModalsState = {
  productForm: false,
  inviteCode: false,
  userSummary: false,
  transferCreator: false,
  participantReceipt: false,
  deleteItem: {
    isOpen: false,
    itemId: null,
  },
  closeReceipt: false,
  closeParticipation: false,
  removeParticipant: {
    isOpen: false,
    participantId: null,
  },
};

export function useReceiptModals(): UseReceiptModalsReturn {
  const [modals, setModals] = useState<ReceiptModalsState>(initialState);

  const openModal = useCallback(
    (modal: keyof ReceiptModalsState, value?: any) => {
      setModals((prev) => {
        if (modal === 'deleteItem') {
          return {
            ...prev,
            deleteItem: {
              isOpen: true,
              itemId: value || null,
            },
          };
        }
        if (modal === 'removeParticipant') {
          return {
            ...prev,
            removeParticipant: {
              isOpen: true,
              participantId: value || null,
            },
          };
        }
        return {
          ...prev,
          [modal]: true,
        };
      });
    },
    []
  );

  const closeModal = useCallback((modal: keyof ReceiptModalsState) => {
    setModals((prev) => {
      if (modal === 'deleteItem') {
        return {
          ...prev,
          deleteItem: {
            isOpen: false,
            itemId: null,
          },
        };
      }
      if (modal === 'removeParticipant') {
        return {
          ...prev,
          removeParticipant: {
            isOpen: false,
            participantId: null,
          },
        };
      }
      return {
        ...prev,
        [modal]: false,
      };
    });
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(initialState);
  }, []);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
  };
}
