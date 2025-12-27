import { Request, Response } from 'express';
import { generateKeywordsForOrganization, getKeywordsForOrganization  } from '../managers/keywordsManager';
import { generateTopicsForOrganization, getTopicsForOrganization } from '../managers/topicsManager';
import { generateSummaryForOrganization } from '../managers/summaryManager';
import { 
  getCreditBalanceForOrganization,
  getCreditLedgerForOrganization,
  grantCreditsToOrganization 
} from '../managers/creditManager/index.js';
import { getUserIdFromToken } from '../managers/authManager/index.js';
import { ContentSource } from '../types/contentTypes';


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


export const generateSummaryForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.body;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    const summary = await generateSummaryForOrganization(organizationId);
    res.status(200).json({ summary });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to generate summary for organization', message: errorMessage });
  }
};

/**
 * Get credit balance for an organization
 * GET /organizations/:id/credits
 */
export const getCreditBalanceController = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.params.id;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    const balance = await getCreditBalanceForOrganization(organizationId);
    res.status(200).json({ organizationId, balance });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to get credit balance', message: errorMessage });
  }
};

/**
 * Get credit ledger for an organization (paginated audit log)
 * GET /organizations/:id/credits/ledger
 * Query params: startDate, endDate, platform, actionType, page, pageSize
 */
export const getCreditLedgerController = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.params.id;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    const filters = {
      organizationId,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      platform: req.query.platform as 'blog' | 'linkedin' | 'twitter' | 'reddit' | undefined,
      actionType: req.query.actionType as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };

    const ledger = await getCreditLedgerForOrganization(filters);
    res.status(200).json(ledger);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to get credit ledger', message: errorMessage });
  }
};

/**
 * Grant credits to an organization (admin operation)
 * POST /admin/organizations/:organizationId/credits/grant
 */
export const grantCreditsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.params.organizationId;
    const { creditsAmount, reason, metadata } = req.body;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    if (!creditsAmount || creditsAmount <= 0) {
      res.status(400).json({ error: 'Credits amount must be greater than 0' });
      return;
    }

    // Extract userId from token
    let grantedByUserId: string | null = null;
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '');
      if (accessToken) {
        grantedByUserId = await getUserIdFromToken(accessToken);
      }
    } catch (error) {
      // Continue with null if token extraction fails
    }

    const newBalance = await grantCreditsToOrganization(
      organizationId,
      grantedByUserId,
      creditsAmount,
      reason,
      metadata || {}
    );

    res.status(200).json({
      organizationId,
      creditsGranted: creditsAmount,
      newBalance,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: 'Failed to grant credits', message: errorMessage });
  }
};

