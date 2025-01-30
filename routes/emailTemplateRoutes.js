import express from 'express';
import { emailTemplateController } from '../controllers/emailTemplateController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes
router.get('/', emailTemplateController.getAllTemplates);
router.post('/', emailTemplateController.createTemplate);
router.get('/:id', emailTemplateController.getTemplateById);
router.put('/:id', emailTemplateController.updateTemplate);
router.delete('/:id', emailTemplateController.deleteTemplate);
router.post('/send', emailTemplateController.sendEmail);
router.post('/default', emailTemplateController.sendDefaultEmail);
router.post('/set-default/:id', emailTemplateController.setDefaultTemplate);

export default router; 