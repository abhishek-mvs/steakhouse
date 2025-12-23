import express, { Router } from 'express';
import { 
  generateKeywordsForOrganizationController,
  getKeywordsForOrganizationController,
  generateTopicsForOrganizationController,
  getTopicsForOrganizationController,
  generateArticleForOrganizationController,
  getArticlesForOrganizationController,
  generateArticleForOrganizationStreamController,
  generateSummaryForOrganizationController
} from '../controllers/adminController';
const router: Router = express.Router();

// Organization routes (all require authentication)
router.post('/generate-keywords', generateKeywordsForOrganizationController);
router.get('/keywords/:organizationId', getKeywordsForOrganizationController);

// Topic routes
router.post('/generate-topics', generateTopicsForOrganizationController);
router.get('/topics/:organizationId', getTopicsForOrganizationController);

// Article routes
router.post('/generate-article', generateArticleForOrganizationController);
router.get('/generate-article-stream', generateArticleForOrganizationStreamController);
router.get('/articles/:organizationId', getArticlesForOrganizationController);

// Summary routes
router.post('/generate-summary', generateSummaryForOrganizationController);

export default router;

