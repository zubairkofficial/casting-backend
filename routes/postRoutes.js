import { postController } from '../controllers/postController.js';
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
// ... existing routes ...
router.get('/search', postController.searchPosts);
router.get('/:spreadsheetId/:sheetName/:accountId', postController.storePosts);
router.get('/', postController.getAllPosts)
router.put('/:id', postController.updatePost);
router.get('/sent-emails', postController.getAllEmailedPosts);
router.get('/favorites', postController.getFavoritesPosts);
router.get('/filter', postController.filterPosts);
router.get('/dateFilter', postController.dateFilter);
router.get('/filtered-posts', postController.getFilteredPosts);


export default router; 
