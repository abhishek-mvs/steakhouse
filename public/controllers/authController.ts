import { Request, Response } from 'express';

import { authenticateUser, getUserIdFromToken, signOutUser, getCurrentUserProfile} from '../managers/authManager/index.js';

/**
 * Login controller
 * Authenticates user with email and password using Supabase Auth
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required',
      });
      return;
    }

    const result = await authenticateUser(email, password);

    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Determine appropriate status code based on error
    if (errorMessage.includes('Authentication failed') || errorMessage.includes('Invalid login')) {
      res.status(401).json({
        error: 'Authentication failed',
        message: errorMessage,
      });
    } else if (errorMessage.includes('not found')) {
      res.status(404).json({
        error: 'User profile not found',
        message: errorMessage,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }
};

/**
 * Logout controller
 * Signs out the current user session
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get access token from Authorization header
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      res.status(400).json({
        error: 'Missing token',
        message: 'Access token is required',
      });
      return;
    }

    // Get user ID from token and sign out
    const userId = await getUserIdFromToken(accessToken);
    await signOutUser(userId);

    res.status(200).json({
      message: 'Successfully logged out',
    });
  } catch (error) {
    console.error('Logout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }
};

/**
 * Get current user controller
 * Returns the current authenticated user's profile
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get access token from Authorization header
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
      return;
    }

    const user = await getCurrentUserProfile(accessToken);

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else if (errorMessage.includes('not found')) {
      res.status(404).json({
        error: 'User profile not found',
        message: errorMessage,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }
};

