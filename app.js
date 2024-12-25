import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userEmailRoutes from './routes/userEmailRoutes.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';
import jobPostingRoutes from './routes/jobPostingRoutes.js';
import sheetsRoutes from './routes/sheetsRoutes.js';
import modelRoutes from './routes/modelRoutes.js';
import emailTemplateRoutes from './routes/emailTemplateRoutes.js';
import postRoutes from './routes/postRoutes.js'

const app = express();

app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Define routes for user and authentication management

const v1Router = express.Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/user-email', userEmailRoutes);
v1Router.use('/google-auth', googleAuthRoutes);
v1Router.use('/job-postings', jobPostingRoutes);
v1Router.use('/sheets', sheetsRoutes);
v1Router.use('/models', modelRoutes);
v1Router.use('/email-templates', emailTemplateRoutes);
v1Router.use('/posts',postRoutes);
app.use('/api/v1', v1Router);


app.get('/api/v1/', (req, res) => {
    res.send({ "Hello": "World" })
})

export default app; // Use export default instead of module.exports