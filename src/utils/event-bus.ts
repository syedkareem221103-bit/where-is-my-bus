import { EventEmitter } from 'events';
import logger from './logger';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // increase max listeners if many modules subscribe
    this.setMaxListeners(50);
  }

  emitEvent(eventName: string, payload: any): void {
    logger.info(`[EventBus] Emitting event: ${eventName}`);
    this.emit(eventName, payload);
  }
}

export const eventBus = new EventBus();
