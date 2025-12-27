import { Request, Response } from 'express';
import { generateKeywordsForOrganization, getKeywordsForOrganization  } from '../managers/keywordsManager';
import { generateTopicsForOrganization, getTopicsForOrganization } from '../managers/topicsManager';
import { generateArticleForOrganization, getArticlesForOrganization, generateArticleForOrganizationStream } from '../managers/articleManager';
import { generateSummaryForOrganization } from '../managers/summaryManager';
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

export const generateArticleForOrganizationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, topicId, source } = req.body;
    
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    if (!topicId) {
      res.status(400).json({ error: 'Topic ID is required' });
      return;
    }

    // Validate source if provided
    const validSources = ['blog', 'linkedin', 'twitter', 'reddit'];
    const contentSource = (source && validSources.includes(source)) ? source : 'blog';

    const article = await generateArticleForOrganization(organizationId, topicId, contentSource);
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

export const generateArticleForOrganizationStreamController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const organizationId = req.query.organizationId as string;
  const topicId = req.query.topicId as string;
  const source = req.query.source as string;

  if (!organizationId || !topicId) {
    res.status(400).json({ error: 'organizationId and topicId required' });
    return;
  }

  // Validate source if provided
  const validSources = ['blog', 'linkedin', 'twitter', 'reddit'];
  const contentSource = (source && validSources.includes(source)) ? source : 'blog';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(': connected\n\n');
  
  (res as any).flush?.();

  const heartbeat = setInterval(() => {
    if (clientDisconnected || res.destroyed) return;
    res.write(': ping\n\n');
    (res as any).flush?.();
  }, 2000); // every 2s

  let clientDisconnected = false;

  req.on('close', () => {
    clientDisconnected = true;
    clearInterval(heartbeat);
    console.log('Client disconnected from SSE stream');
  });
  
  const sendEvent = (event: { type: string; chunk?: string; data?: any }) => {
    if (clientDisconnected || res.destroyed) return;

    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data ?? event.chunk)}\n\n`);
    (res as any).flush?.();
  };

  try {
    await generateArticleForOrganizationStream(
      organizationId,
      topicId,
      sendEvent,
      contentSource as ContentSource
    );

    clearInterval(heartbeat);
    // ✅ end ONLY after completion
    sendEvent({ type: 'done', data: '[DONE]' });
    res.end();
  } catch (error) {
    if (!clientDisconnected) {
      sendEvent({
        type: 'error',
        data: { message: 'Generation failed' },
      });
      res.end();
    }
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

