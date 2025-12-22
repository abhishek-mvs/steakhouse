import express, { Router } from 'express';
import { healthCheck } from '../controllers/healthController.js';
import authRoutes from './authRoutes.js';
import organizationRoutes from './organizationRoutes.js';

const router: Router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Authentication routes
router.use('/auth', authRoutes);

// Organization routes
router.use('/organization', organizationRoutes);

export default router;

