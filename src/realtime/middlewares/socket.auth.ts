import { Socket as IOSocket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { initializeKeys } from '../../utils/crypto';
import logger from '../../utils/logger';
import { UserContext, SocketData } from '../types/socket.types';

type Socket = IOSocket<any, any, any, SocketData>;

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

  if (!token) {
    logger.warn(`Socket connection rejected: No token provided (ID: ${socket.id})`);
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const parsedToken = token.startsWith('Bearer ') ? token.split(' ')[1] : (token as string);
    const { publicKey } = initializeKeys();
    
    // Verify the JWT token
    const decoded = jwt.verify(parsedToken, publicKey, { algorithms: ['ES256'] }) as any;
    
    // Attach user data to socket
    socket.data.user = {
      id: decoded.id,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    logger.warn(`Socket connection rejected: Invalid token (ID: ${socket.id})`);
    next(new Error('Authentication error: Invalid token'));
  }
};
