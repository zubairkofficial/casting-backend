import express from 'express';
import { googleAuthController } from '../controllers/googleAuthController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();


router.get('/callback', googleAuthController.handleCallback);
router.post('/connect', authenticateToken, googleAuthController.connectAccount);
router.get('/accounts', authenticateToken, googleAuthController.getConnectedAccounts);
router.delete('/accounts/:id', authenticateToken, googleAuthController.disconnectAccount);
router.get('/accounts/:accountId/files', authenticateToken, googleAuthController.getGoogleDriveFiles);
router.get('/files/:accountId', authenticateToken, googleAuthController.getGoogleDriveFiles);

export default router; 