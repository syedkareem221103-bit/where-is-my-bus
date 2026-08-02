import { create } from 'zustand';

interface ReportUIState {
  isCreateModalOpen: boolean;
  setCreateModalOpen: (isOpen: boolean) => void;
  activeTab: 'subscriptions' | 'executions';
  setActiveTab: (tab: 'subscriptions' | 'executions') => void;
}

export const useReportUIStore = create<ReportUIState>((set) => ({
  isCreateModalOpen: false,
  setCreateModalOpen: (isOpen) => set({ isCreateModalOpen: isOpen }),
  activeTab: 'subscriptions',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
