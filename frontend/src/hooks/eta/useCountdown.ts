import { useState, useEffect } from 'react';
import { useETAStore } from '../../store/useETAStore';

export function useCountdown() {
  const currentETA = useETAStore(state => state.currentETA);
  
  // Local state for the countdown string
  const [countdownText, setCountdownText] = useState<string>('--:--');

  useEffect(() => {
    if (!currentETA || currentETA.isDelayed) {
      return;
    }

    const updateCountdown = () => {
      const remainingMs = currentETA.estimatedArrivalAt - Date.now();
      if (remainingMs <= 0) {
        setCountdownText('Arriving');
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      if (minutes > 60) {
        setCountdownText('> 1 hr');
      } else {
        setCountdownText(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [currentETA]);

  if (!currentETA) return '--:--';
  if (currentETA.isDelayed) return 'Delayed';
  return countdownText;
}
