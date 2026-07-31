import React, { useState, useEffect } from 'react';
import { useETAStore } from '../../store/useETAStore';

export const CountdownTimer: React.FC = () => {
  const [countdownText, setCountdownText] = useState<string>('--:--');
  const [ariaLabel, setAriaLabel] = useState<string>('Calculating arrival time');
  const currentETA = useETAStore(state => state.currentETA);

  useEffect(() => {
    const updateCountdown = () => {
      if (!currentETA) {
        setCountdownText('--:--');
        setAriaLabel('Calculating arrival time');
        return;
      }
      
      if (currentETA.isDelayed) {
        setCountdownText('Delayed');
        setAriaLabel('Bus is currently delayed');
        return;
      }

      const remainingMs = currentETA.estimatedArrivalAt - Date.now();
      if (remainingMs <= 0) {
        setCountdownText('Arriving');
        setAriaLabel('Arriving now');
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
      setAriaLabel(`Arriving in approximately ${Math.ceil(remainingMs / 60000)} minutes`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [currentETA]);

  return (
    <div 
      className="text-2xl font-bold font-mono tracking-wider text-slate-800 dark:text-slate-100"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span aria-hidden="true">{countdownText}</span>
    </div>
  );
};
