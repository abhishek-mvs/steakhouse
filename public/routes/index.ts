import express, { Router } from 'express';
import { healthCheck } from '../controllers/healthController.js';
import authRoutes from './authRoutes.js';
import organizationRoutes from './organizationRoutes.js';
import adminRoutes from './adminRoutes.js';

const router: Router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Authentication routes
router.use('/auth', authRoutes);

// Organization routes
router.use('/organization', organizationRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router;

