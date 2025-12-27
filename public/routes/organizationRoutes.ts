import express, { Router } from 'express';
import { 
  getOrganization, 
  updateOrganization,
  getKeywords,
  getTopics,
  generateArticle,
  getArticles
} from '../controllers/organizationController.js';
import { getCreditBalanceController, getCreditLedgerController } from '../controllers/adminController.js';

const router: Router = express.Router();

// Organization routes (all require authentication)
router.get('/', getOrganization);
router.put('/', updateOrganization);

// Keywords routes (user's organization - read-only)
router.get('/keywords', getKeywords);

// Topics routes (user's organization - read-only)
router.get('/topics', getTopics);

// Articles routes (user's organization)
router.post('/articles/generate', generateArticle);
router.get('/articles', getArticles);

// Credit routes
router.get('/:id/credits', getCreditBalanceController);
router.get('/:id/credits/ledger', getCreditLedgerController);

export default router;

