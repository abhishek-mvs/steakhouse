import express, { Router } from 'express';
import { 
  generateKeywordsForOrganizationController,
  getKeywordsForOrganizationController,
  generateTopicsForOrganizationController,
  getTopicsForOrganizationController
} from '../controllers/adminController';
const router: Router = express.Router();

// Organization routes (all require authentication)
router.post('/generate-keywords', generateKeywordsForOrganizationController);
router.get('/keywords/:organizationId', getKeywordsForOrganizationController);

// Topic routes
router.post('/generate-topics', generateTopicsForOrganizationController);
router.get('/topics/:organizationId', getTopicsForOrganizationController);


export default router;

