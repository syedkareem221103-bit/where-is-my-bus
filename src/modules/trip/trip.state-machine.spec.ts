import { TripStateMachine } from './trip.state-machine';
import { TripStatus } from '@prisma/client';
import { BadRequestError } from '../../errors';

describe('TripStateMachine', () => {
  describe('validateTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => TripStateMachine.validateTransition(TripStatus.SCHEDULED, TripStatus.STARTED)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.STARTED, TripStatus.EN_ROUTE)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.EN_ROUTE, TripStatus.AT_STOP)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.AT_STOP, TripStatus.EN_ROUTE)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.EN_ROUTE, TripStatus.COMPLETED)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.SCHEDULED, TripStatus.CANCELLED)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.STARTED, TripStatus.EMERGENCY)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.EN_ROUTE, TripStatus.EMERGENCY)).not.toThrow();
      expect(() => TripStateMachine.validateTransition(TripStatus.EMERGENCY, TripStatus.COMPLETED)).not.toThrow();
    });

    it('should not throw on same state transition (idempotent)', () => {
      expect(() => TripStateMachine.validateTransition(TripStatus.STARTED, TripStatus.STARTED)).not.toThrow();
    });

    it('should throw BadRequestError on invalid transitions', () => {
      expect(() => TripStateMachine.validateTransition(TripStatus.SCHEDULED, TripStatus.COMPLETED))
        .toThrow(BadRequestError);
      expect(() => TripStateMachine.validateTransition(TripStatus.STARTED, TripStatus.COMPLETED))
        .toThrow(BadRequestError);
      expect(() => TripStateMachine.validateTransition(TripStatus.COMPLETED, TripStatus.EN_ROUTE))
        .toThrow(BadRequestError);
      expect(() => TripStateMachine.validateTransition(TripStatus.CANCELLED, TripStatus.STARTED))
        .toThrow(BadRequestError);
    });
  });

  describe('isActiveState', () => {
    it('should return true for active states', () => {
      expect(TripStateMachine.isActiveState(TripStatus.STARTED)).toBe(true);
      expect(TripStateMachine.isActiveState(TripStatus.EN_ROUTE)).toBe(true);
      expect(TripStateMachine.isActiveState(TripStatus.AT_STOP)).toBe(true);
      expect(TripStateMachine.isActiveState(TripStatus.EMERGENCY)).toBe(true);
      expect(TripStateMachine.isActiveState(TripStatus.ACTIVE)).toBe(true);
    });

    it('should return false for inactive states', () => {
      expect(TripStateMachine.isActiveState(TripStatus.SCHEDULED)).toBe(false);
      expect(TripStateMachine.isActiveState(TripStatus.COMPLETED)).toBe(false);
      expect(TripStateMachine.isActiveState(TripStatus.CANCELLED)).toBe(false);
    });
  });
});
