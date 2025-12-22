import { Request, Response } from 'express';
import { generateKeywordsForOrganization, getKeywordsForOrganization  } from '../managers/keywordsManager';


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