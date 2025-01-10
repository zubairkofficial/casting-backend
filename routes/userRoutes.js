import express from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js'; // Assuming you have these middleware

const router = express.Router();

// Public routes
// Sign up

// Protected routes
router.use(authenticateToken);

// User routes
router.get('/:id', userController.getOne);
router.put('/:id', userController.update);


// Admin only routes
router.use(isAdmin);
router.post('/', userController.create); 
router.get('/', userController.getAll);
router.delete('/:id', userController.deleteUser);

export default router;