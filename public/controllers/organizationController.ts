import { Request, Response } from 'express';
import {
  getOrganizationByUserId,
  updateOrganizationByUserId,
} from '../managers/organizationManager/index.js';
import { getUserIdFromToken } from '../managers/authManager/index.js';
import { 
  getKeywordsForOrganization 
} from '../managers/keywordsManager/index.js';
import { 
  getTopicsForOrganization 
} from '../managers/topicsManager/index.js';
import { 
  generateArticleForOrganization, 
  getArticlesForOrganization,
} from '../managers/articleManager/index.js';

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

/**
 * Get keywords for the authenticated user's organization
 * GET /organization/keywords
 */
export const getKeywords = async (req: Request, res: Response): Promise<void> => {
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

    // Get organization ID from user profile
    const organization = await getOrganizationByUserId(userId);
    const organizationId = organization.organization_id;

    // Get keywords
    const keywords = await getKeywordsForOrganization(organizationId);
    res.status(200).json(keywords);
  } catch (error) {
    console.error('Get keywords error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get keywords for organization',
        message: errorMessage 
      });
    }
  }
};

/**
 * Get topics for the authenticated user's organization
 * GET /organization/topics?status=Completed|pending
 */
export const getTopics = async (req: Request, res: Response): Promise<void> => {
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

    // Get organization ID from user profile
    const organization = await getOrganizationByUserId(userId);
    const organizationId = organization.organization_id;

    const status = req.query.status as 'Completed' | 'pending' | undefined;

    // Validate status if provided
    if (status && status !== 'Completed' && status !== 'pending') {
      res.status(400).json({ error: 'Invalid status. Must be "Completed" or "pending"' });
      return;
    }

    // Get topics
    const topics = await getTopicsForOrganization(organizationId, status);
    res.status(200).json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get topics for organization',
        message: errorMessage 
      });
    }
  }
};

/**
 * Generate article for the authenticated user's organization
 * POST /organization/articles/generate
 */
export const generateArticle = async (req: Request, res: Response): Promise<void> => {
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

    // Get organization ID from user profile
    const organization = await getOrganizationByUserId(userId);
    const organizationId = organization.organization_id;

    const { topicId, source } = req.body;

    if (!topicId) {
      res.status(400).json({ error: 'Topic ID is required' });
      return;
    }

    // Validate source if provided
    const validSources = ['blog', 'linkedin', 'twitter', 'reddit'];
    const contentSource = (source && validSources.includes(source)) ? source : 'blog';

    // Generate article
    const article = await generateArticleForOrganization(
      organizationId,
      topicId,
      contentSource,
      userId
    );
    res.status(200).json(article);
  } catch (error) {
    console.error('Generate article error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else if (errorMessage.includes('Insufficient credits')) {
      res.status(402).json({ error: 'Insufficient credits', message: errorMessage });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate article for organization', 
        message: errorMessage 
      });
    }
  }
};

/**
 * Get articles for the authenticated user's organization
 * GET /organization/articles?topicId=uuid
 */
export const getArticles = async (req: Request, res: Response): Promise<void> => {
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

    // Get organization ID from user profile
    const organization = await getOrganizationByUserId(userId);
    const organizationId = organization.organization_id;

    const topicId = req.query.topicId as string | undefined;

    // Get articles
    const articles = await getArticlesForOrganization(organizationId, topicId);
    res.status(200).json(articles);
  } catch (error) {
    console.error('Get articles error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get articles for organization',
        message: errorMessage 
      });
    }
  }
};
