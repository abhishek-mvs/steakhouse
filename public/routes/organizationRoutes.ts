import express, { Router } from 'express';
import { getOrganization, updateOrganization } from '../controllers/organizationController.js';

const router: Router = express.Router();

// Organization routes (all require authentication)
router.get('/', getOrganization);
router.put('/', updateOrganization);

export default router;

