// routes/authRoutes.js
import express from 'express';
import { signup, verifyEmail, signin } from '../controllers/authController.js';

const router = express.Router();

// Signup route
router.post('/register', signup);
router.get('/verify-email', verifyEmail);
router.post('/login', signin);


export default router;