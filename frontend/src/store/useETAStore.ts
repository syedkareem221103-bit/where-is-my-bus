import { create } from 'zustand';
import type { ETAPayload } from '../types/eta.types';

interface ETAState {
  currentETA: ETAPayload | null;
  lastUpdateTimestamp: number | null;
  updateETA: (payload: ETAPayload) => void;
  clearETA: () => void;
}

export const useETAStore = create<ETAState>((set, get) => ({
  currentETA: null,
  lastUpdateTimestamp: null,

  updateETA: (payload: ETAPayload) => {
    const current = get().currentETA;
    
    // Strict Sequence and Timestamp Validation
    if (current) {
      if (payload.sequenceNumber <= current.sequenceNumber) {
        return; // Drop stale or duplicate packet
      }
      
      // If we somehow get a packet generated older than what we have, reject it
      if (payload.timestamp < current.timestamp) {
        return;
      }
    }

    set({ currentETA: payload, lastUpdateTimestamp: Date.now() });
  },

  clearETA: () => {
    set({ currentETA: null, lastUpdateTimestamp: null });
  }
}));
