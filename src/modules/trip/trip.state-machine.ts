import { TripStatus } from '@prisma/client';
import { BadRequestError } from '../../errors';

type AllowedTransitions = {
  [key in TripStatus]?: TripStatus[];
};

export const TRIP_TRANSITIONS: AllowedTransitions = {
  [TripStatus.SCHEDULED]: [TripStatus.STARTED, TripStatus.CANCELLED],
  [TripStatus.STARTED]: [TripStatus.EN_ROUTE, TripStatus.EMERGENCY],
  [TripStatus.EN_ROUTE]: [TripStatus.AT_STOP, TripStatus.COMPLETED, TripStatus.EMERGENCY],
  [TripStatus.AT_STOP]: [TripStatus.EN_ROUTE],
  [TripStatus.EMERGENCY]: [TripStatus.COMPLETED],
};

export class TripStateMachine {
  static validateTransition(currentStatus: TripStatus, newStatus: TripStatus): void {
    if (currentStatus === newStatus) {
      return; // No transition needed
    }

    const allowedNextStates = TRIP_TRANSITIONS[currentStatus];

    if (!allowedNextStates || !allowedNextStates.includes(newStatus)) {
      throw new BadRequestError(`Invalid trip state transition from ${currentStatus} to ${newStatus}`);
    }
  }

  static isActiveState(status: TripStatus): boolean {
    const activeStates: TripStatus[] = [
      TripStatus.STARTED,
      TripStatus.EN_ROUTE,
      TripStatus.AT_STOP,
      TripStatus.EMERGENCY,
      TripStatus.ACTIVE, // Legacy compatibility
    ];
    return activeStates.includes(status);
  }
}
