import { create } from 'zustand';
import type { ConnectionStatus } from '../types/socket.types';

interface SocketState {
  status: ConnectionStatus;
  lastPing: number | null;
  setStatus: (status: ConnectionStatus) => void;
  setLastPing: (timestamp: number) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  status: 'DISCONNECTED',
  lastPing: null,
  setStatus: (status) => set({ status }),
  setLastPing: (lastPing) => set({ lastPing }),
}));
