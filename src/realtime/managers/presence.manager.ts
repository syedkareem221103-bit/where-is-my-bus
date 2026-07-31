import { Server } from 'socket.io';
import logger from '../../utils/logger';
import { UserContext } from '../types/socket.types';

export class PresenceManager {
  private static instance: PresenceManager;
  private io: Server | null = null;
  
  // In-memory mapping of userId -> socket connections and last seen
  // Future: Migrate to Redis for horizontal scalability
  private userSessions: Map<string, { socketIds: Set<string>; role: string; organizationId: string; lastSeen: Date }> = new Map();

  private constructor() {}

  public static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  public setServer(io: Server) {
    this.io = io;
  }

  public markOnline(socketId: string, user: UserContext) {
    if (!this.io) return;
    
    let session = this.userSessions.get(user.id);
    const isNewLogin = !session || session.socketIds.size === 0;

    if (!session) {
      session = {
        socketIds: new Set(),
        role: user.role,
        organizationId: user.organizationId,
        lastSeen: new Date(),
      };
      this.userSessions.set(user.id, session);
    }

    session.socketIds.add(socketId);
    session.lastSeen = new Date();

    if (isNewLogin) {
      logger.info(`User ${user.id} (${user.role}) came online in Org ${user.organizationId}`, { socketId });
      // Broadcast to admins that a user came online
      this.io.to(`admin_${user.organizationId}`).emit('server:user:online', {
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public markOffline(socketId: string, user: UserContext) {
    if (!this.io) return;

    const session = this.userSessions.get(user.id);
    if (!session) return;

    session.socketIds.delete(socketId);
    session.lastSeen = new Date();

    if (session.socketIds.size === 0) {
      logger.info(`User ${user.id} (${user.role}) went offline in Org ${user.organizationId}`, { socketId });
      // Broadcast to admins that a user went offline
      this.io.to(`admin_${user.organizationId}`).emit('server:user:offline', {
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public isUserOnline(userId: string): boolean {
    const session = this.userSessions.get(userId);
    return session ? session.socketIds.size > 0 : false;
  }
}
