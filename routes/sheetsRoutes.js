import express from 'express';
import { sheetsController } from '../controllers/sheetsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:spreadsheetId/:sheetName/:accountId', sheetsController.getSheetData);
router.get('/', sheetsController.getModels);
export default router; 