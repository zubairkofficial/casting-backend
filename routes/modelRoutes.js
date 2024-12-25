import express from 'express';
import { ModelController } from '../controllers/modelController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const modelController = new ModelController();
router.use(authenticateToken);
router.post('/', modelController.create);
router.get('/', modelController.getAll);
router.get('/:id', modelController.getById);
router.put('/:id', modelController.update);
router.delete('/:id', modelController.delete);

export default router; 