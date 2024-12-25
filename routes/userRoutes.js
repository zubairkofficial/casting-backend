import express from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js'; // Assuming you have these middleware

const router = express.Router();

// Public routes
router.post('/', userController.create); // Sign up

// Protected routes
router.use(authenticateToken);

// User routes
router.get('/profile/:id', userController.getOne);
router.put('/profile/:id', userController.update);
router.put('/change-password/:id', userController.changePassword);

// Admin only routes
router.use(isAdmin);
router.get('/', userController.getAll);
router.delete('/:id', userController.delete);

export default router;