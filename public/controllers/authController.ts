import { Request, Response } from 'express';

import { authenticateUser, getUserIdFromToken, signOutUser, getCurrentUserProfile, signUpUser } from '../managers/authManager/index.js';

/**
 * Signup controller
 * Creates a new user account and profile
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, organization_name, domain_url, role } = req.body;

    if (!email || !password || !name || !organization_name || !domain_url) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, name, organization_name, and domain_url are required',
      });
      return;
    }

    const result = await signUpUser({
      email,
      password,
      name,
      organization_name,
      domain_url,
      role, // Optional - defaults to 'Admin' for organization creator
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Determine appropriate status code based on error
    if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      res.status(409).json({
        error: 'User already exists',
        message: errorMessage,
      });
    } else if (errorMessage.includes('organization') || errorMessage.includes('foreign key')) {
      res.status(400).json({
        error: 'Invalid organization',
        message: 'Organization not found or invalid',
      });
    } else if (errorMessage.includes('EMAIL_CONFIRMATION_REQUIRED')) {
      // User created but needs email confirmation
      res.status(201).json({
        message: errorMessage.replace('EMAIL_CONFIRMATION_REQUIRED: ', ''),
        requiresEmailConfirmation: true,
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

    // Sign out using the access token
    await signOutUser(accessToken);

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

