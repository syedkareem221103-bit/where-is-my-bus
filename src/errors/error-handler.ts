import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from './app-error';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod Validation Schema Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle Prisma Database Operations Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique key violation
    if (err.code === 'P2002') {
      res.status(409).json({
        status: 'error',
        message: `Unique constraint failed on field(s): ${(err.meta?.target as string[])?.join(', ') || ''}`,
      });
      return;
    }
    // Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: err.meta?.cause || 'Record to update or delete was not found',
      });
      return;
    }
    // Foreign key constraint failed
    if (err.code === 'P2003') {
      res.status(400).json({
        status: 'error',
        message: `Foreign key constraint failed on field: ${err.meta?.field_name as string}`,
      });
      return;
    }
  }

  // Handle Custom Operational App Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Handle default unhandled Internal Server Errors
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    status: 'error',
    message: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
