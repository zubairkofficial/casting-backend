import express from 'express';
import { jobPostingController } from '../controllers/jobPostingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:accountId', jobPostingController.getJobPostings);

export default router; 