import express, { Router } from 'express';
import { generateKeywordsForOrganizationController } from '../controllers/adminController';
import { getKeywordsForOrganizationController } from '../controllers/adminController';
const router: Router = express.Router();

// Organization routes (all require authentication)
router.post('/generate-keywords', generateKeywordsForOrganizationController);
router.get('/keywords/:organizationId', getKeywordsForOrganizationController);


export default router;

