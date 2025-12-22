import express, { Router } from 'express';
import { signup, login, logout, getCurrentUser } from '../controllers/authController.js';

const router: Router = express.Router();

// Authentication routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', getCurrentUser);

export default router;

