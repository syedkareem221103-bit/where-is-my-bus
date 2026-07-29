import { Trip } from '@prisma/client';
import { BadRequestError } from '../../errors';

export class TripValidationEngine {
  validateStart(trip: Trip | null): asserts trip is Trip {
    if (!trip) {
      throw new BadRequestError('No scheduled trip found for today');
    }
    if (trip.status === 'COMPLETED') {
      throw new BadRequestError('Completed trips cannot restart');
    }
    if (trip.status === 'CANCELLED') {
      throw new BadRequestError('Cancelled trips cannot restart');
    }
    if (trip.status !== 'SCHEDULED') {
      throw new BadRequestError('Trip is already active');
    }
  }
}
