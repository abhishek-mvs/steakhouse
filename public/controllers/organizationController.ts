import { Request, Response } from 'express';
import {
  getOrganizationByUserId,
  updateOrganizationByUserId,
} from '../managers/organizationManager/index.js';
import { getUserIdFromToken } from '../managers/authManager/index.js';

/**
 * Get organization details for the authenticated user
 */
export const getOrganization = async (req: Request, res: Response): Promise<void> => {
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

    // Get user ID from token
    const userId = await getUserIdFromToken(accessToken);

    // Get organization details
    const organization = await getOrganizationByUserId(userId);

    res.status(200).json({
      organization,
    });
  } catch (error) {
    console.error('Get organization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else if (errorMessage.includes('not found')) {
      res.status(404).json({
        error: 'Organization not found',
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
 * Update organization details (Admin only)
 */
export const updateOrganization = async (req: Request, res: Response): Promise<void> => {
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

    // Get user ID from token
    const userId = await getUserIdFromToken(accessToken);

    // Update organization (manager will check Admin role)
    const organization = await updateOrganizationByUserId(userId, req.body);

    res.status(200).json({
      organization,
    });
  } catch (error) {
    console.error('Update organization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else if (errorMessage.includes('Only Admins')) {
      res.status(403).json({
        error: 'Forbidden',
        message: errorMessage,
      });
    } else if (errorMessage.includes('not found')) {
      res.status(404).json({
        error: 'Organization not found',
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

