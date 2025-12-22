import { Request, Response } from 'express';

/**
 * Health check controller
 * Provides basic health status endpoint
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

