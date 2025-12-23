import { Request, Response } from 'express';
import { generateKeywordsForOrganization, getKeywordsForOrganization  } from '../managers/keywordsManager';
import { generateTopicsForOrganization, getTopicsForOrganization } from '../managers/topicsManager';
import { generateArticleForOrganization, getArticlesForOrganization } from '../managers/articleManager';


export const generateKeywordsForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.body;
    const keywords = await generateKeywordsForOrganization(organizationId);
    res.status(200).json(keywords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate keywords for organization, ' + error });
  }
};

export const getKeywordsForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.params.organizationId;
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }
    const keywords = await getKeywordsForOrganization(organizationId);
    res.status(200).json(keywords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get keywords for organization' });
  }
};

export const generateTopicsForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.body;
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }
    const topics = await generateTopicsForOrganization(organizationId);
    res.status(200).json(topics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to generate topics for organization', message: errorMessage });
  }
};

export const getTopicsForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.params.organizationId;
    const status = req.query.status as 'Completed' | 'pending' | undefined;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    // Validate status if provided
    if (status && status !== 'Completed' && status !== 'pending') {
      res.status(400).json({ error: 'Invalid status. Must be "Completed" or "pending"' });
      return;
    }

    const topics = await getTopicsForOrganization(organizationId, status);
    res.status(200).json(topics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to get topics for organization', message: errorMessage });
  }
};

export const generateArticleForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, topicId } = req.body;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    if (!topicId) {
      res.status(400).json({ error: 'Topic ID is required' });
      return;
    }

    const article = await generateArticleForOrganization(organizationId, topicId);
    res.status(200).json(article);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to generate article for organization', message: errorMessage });
  }
};

export const getArticlesForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.params.organizationId;
    const topicId = req.query.topicId as string | undefined;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    const articles = await getArticlesForOrganization(organizationId, topicId);
    res.status(200).json(articles);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to get articles for organization', message: errorMessage });
  }
};