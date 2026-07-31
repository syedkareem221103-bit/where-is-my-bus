/**
 * Listener Registry
 * Tracks active socket listeners to prevent zombies and duplicates, especially during HMR.
 */

export type SocketCallback = (...args: unknown[]) => void;

class ListenerRegistry {
  private static instance: ListenerRegistry;
  private listeners: Map<string, Set<SocketCallback>> = new Map();

  private constructor() {}

  public static getInstance(): ListenerRegistry {
    if (!ListenerRegistry.instance) {
      ListenerRegistry.instance = new ListenerRegistry();
    }
    return ListenerRegistry.instance;
  }

  /**
   * Registers a callback for an event. Returns true if added, false if already exists.
   */
  public addListener(event: string, callback: SocketCallback): boolean {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const eventSet = this.listeners.get(event)!;
    if (eventSet.has(callback)) {
      return false; // Duplicate listener
    }
    
    eventSet.add(callback);
    return true;
  }

  /**
   * Removes a callback from an event.
   */
  public removeListener(event: string, callback: SocketCallback): void {
    const eventSet = this.listeners.get(event);
    if (eventSet) {
      eventSet.delete(callback);
      if (eventSet.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Gets all active callbacks for an event.
   */
  public getListeners(event: string): SocketCallback[] {
    const eventSet = this.listeners.get(event);
    return eventSet ? Array.from(eventSet) : [];
  }
  
  /**
   * Clears all listeners. Useful on logout or total teardown.
   */
  public clearAll(): void {
    this.listeners.clear();
  }
}

export const listenerRegistry = ListenerRegistry.getInstance();
