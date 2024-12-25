import express from 'express';
import { userEmailController } from '../controllers/userEmailController.js';
import  { authenticateToken } from '../middleware/auth.js'; // Assuming you have auth middleware

const router = express.Router();

// All routes are protected with authentication
router.use(authenticateToken);

// CRUD routes for user emails
router.post('/', userEmailController.create);
router.get('/', userEmailController.getAllByUser);
router.get('/:id', userEmailController.getOne);
router.put('/:id', userEmailController.update);
router.delete('/:id', userEmailController.delete);

export default router; 