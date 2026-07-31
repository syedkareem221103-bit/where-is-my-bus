import { io, Socket } from 'socket.io-client';
import { useSocketStore } from '../../store/useSocketStore';
import { listenerRegistry } from './listenerRegistry';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
const DEBUG = import.meta.env.VITE_SOCKET_DEBUG === 'true';

interface QueuedEvent {
  event: string;
  args: unknown[];
}

class SocketClient {
  private static instance: SocketClient;
  private socket: Socket | null = null;
  private offlineQueue: QueuedEvent[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  
  // To avoid circular dependency with auth service for refresh, we accept token explicitly
  private currentToken: string | null = null;

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public connect(token: string): void {
    if (this.socket?.connected) {
      if (this.currentToken === token) return;
      this.disconnect(); // Token changed, reconnect
    }
    
    this.currentToken = token;
    useSocketStore.getState().setStatus('CONNECTING');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupListeners();
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = null;
    this.stopHeartbeatMonitor();
    this.offlineQueue = [];
    listenerRegistry.clearAll();
    useSocketStore.getState().setStatus('DISCONNECTED');
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Safe emit that queues if disconnected.
   */
  public emit(event: string, ...args: unknown[]): void {
    if (this.socket && this.socket.connected) {
      if (DEBUG) console.log(`[Socket Emit] ${event}`, ...args);
      this.socket.emit(event, ...args);
    } else {
      if (DEBUG) console.log(`[Socket Queued] ${event}`, ...args);
      // Optional: Logic to override idempotency events (e.g. replace old GPS ping with new)
      // For now, simple FIFO queue
      this.offlineQueue.push({ event, args });
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      if (DEBUG) console.log('[Socket Connected]');
      useSocketStore.getState().setStatus('CONNECTED');
      this.startHeartbeatMonitor();
      this.flushQueue();
    });

    this.socket.on('disconnect', (reason) => {
      if (DEBUG) console.log(`[Socket Disconnected] Reason: ${reason}`);
      this.stopHeartbeatMonitor();
      if (reason === 'io server disconnect') {
        // Disconnected explicitly by server, won't automatically reconnect
        useSocketStore.getState().setStatus('DISCONNECTED');
      } else {
        useSocketStore.getState().setStatus('RECONNECTING');
      }
    });

    this.socket.on('connect_error', (error) => {
      if (DEBUG) console.error('[Socket Connect Error]', error.message);
      if (error.message.includes('Authentication')) {
        useSocketStore.getState().setStatus('AUTH_FAILED');
        this.socket?.disconnect();
        // The SocketProvider will intercept AUTH_FAILED and trigger token refresh
      } else {
        useSocketStore.getState().setStatus('RECONNECTING');
      }
    });

    // Handle generic ping events from socket.io
    this.socket.on('ping', () => {
      useSocketStore.getState().setLastPing(Date.now());
    });
    this.socket.on('pong', () => {
      useSocketStore.getState().setLastPing(Date.now());
    });
  }

  private flushQueue(): void {
    if (!this.socket || !this.socket.connected || this.offlineQueue.length === 0) return;
    
    if (DEBUG) console.log(`[Socket] Flushing ${this.offlineQueue.length} queued events`);
    
    // Copy and clear
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    queue.forEach(({ event, args }) => {
      this.emit(event, ...args);
    });
  }

  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor();
    
    // Check every 10 seconds if we haven't received a ping/pong in 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const lastPing = useSocketStore.getState().lastPing;
      if (lastPing && Date.now() - lastPing > 30000) {
        if (DEBUG) console.warn('[Socket Heartbeat] Missed heartbeat, forcing reconnect');
        if (this.socket && this.socket.connected) {
          this.socket.disconnect();
          this.socket.connect();
        }
      }
    }, 10000);
  }

  private stopHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const socketClient = SocketClient.getInstance();
