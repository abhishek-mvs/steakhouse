import express, { Router } from 'express';
import { 
  generateKeywordsForOrganizationController,
  getKeywordsForOrganizationController,
  generateTopicsForOrganizationController,
  getTopicsForOrganizationController,
  generateSummaryForOrganizationController,
  grantCreditsController
} from '../controllers/adminController';
const router: Router = express.Router();

// Organization routes (all require authentication)
router.post('/generate-keywords', generateKeywordsForOrganizationController);
router.get('/keywords/:organizationId', getKeywordsForOrganizationController);

// Topic routes
router.post('/generate-topics', generateTopicsForOrganizationController);
router.get('/topics/:organizationId', getTopicsForOrganizationController);

// Article routes (streaming only - non-streaming moved to user routes)

// Summary routes
router.post('/generate-summary', generateSummaryForOrganizationController);

// Credit routes
router.post('/organizations/:organizationId/credits/grant', grantCreditsController);

export default router;

