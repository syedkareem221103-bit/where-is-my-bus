import React from 'react';
import { useETAStore } from '../../store/useETAStore';

export const LiveETA: React.FC = () => {
  const currentETA = useETAStore(state => state.currentETA);

  if (!currentETA) {
    return <div aria-live="polite">ETA: Calculating...</div>;
  }

  if (currentETA.isDelayed) {
    return <div aria-live="polite" className="text-red-500 font-bold">ETA: Delayed</div>;
  }

  const arrivalDate = new Date(currentETA.estimatedArrivalAt);
  const timeString = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div aria-live="polite" className="font-medium">
      ETA: {timeString}
      {currentETA.confidence === 'LOW' && <span className="ml-2 text-sm text-yellow-500" title="Low accuracy due to GPS noise">(Low Confidence)</span>}
    </div>
  );
};
