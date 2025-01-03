import { postController } from '../controllers/postController.js';
import express from 'express';

const router = express.Router();

// ... existing routes ...
router.get('/search', postController.searchPosts);


router.get('/:spreadsheetId/:sheetName/:accountId', postController.storePosts);
router.get ('/', postController.getAllPosts)
router.put('/:id', postController.updatePost);
router.get('/sent-emails', postController.getAllEmailedPosts);
router.get('/favorites', postController.getFavoritesPosts);
router.get('/filter', postController.filterPosts);




export default router; 
