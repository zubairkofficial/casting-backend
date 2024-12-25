import { postController } from '../controllers/postController.js';
import express from 'express';

const router = express.Router();

// ... existing routes ...

router.get('/:spreadsheetId/:sheetName/:accountId', postController.storePosts);
router.get ('/', postController.getAllPosts)
router.put('/:id', postController.updatePost);
router.get('/search', postController.searchPosts);


export default router; 
