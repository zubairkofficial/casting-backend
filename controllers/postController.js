import { google } from 'googleapis';
import { UserEmail, Post } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

export const postController = {
    async storePosts(req, res) {
        try {
            const { spreadsheetId, sheetName, accountId } = req.params;

            // Get the email account with tokens
            const emailAccount = await UserEmail.findOne({
                where: { id: accountId }
            });

            if (!emailAccount) {
                return res.status(404).json({ message: 'Email account not found' });
            }

            // Create oauth2Client instance
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                `${process.env.BACKEND_API_URL}google-auth/callback`
            );

            oauth2Client.setCredentials({
                access_token: emailAccount.accessToken,
                refresh_token: emailAccount.refreshToken,
                expiry_date: new Date(emailAccount.tokenExpiry).getTime()
            });

            const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: sheetName,
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return res.status(404).json({ message: 'No data found.' });
            }

            // Convert headers and create post objects
            const headers = rows[0].map(header =>
                header.toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
            );

            const posts = rows.slice(1).map(row => {
                const postData = {};
                headers.forEach((header, index) => {
                    postData[header] = row[index] || '';
                });
                return {
                    postId: postData.postId,
                    isFavorite: false,
                    isEmailSent: false,
                    data: postData,
                };
            });
            console.log(posts);
            // Find existing posts and create only new ones
            const existingPosts = await Post.findAll();
            const existingEmails = new Set(existingPosts.map(post => post.postId));

            const newPosts = posts.filter(post => !existingEmails.has(post.postId));

            if (newPosts.length > 0) {
                await Post.bulkCreate(newPosts);
            }

            res.json({
                message: `Processed ${posts.length} posts. Added ${newPosts.length} new posts.`,
                newPosts: newPosts
            });

        } catch (error) {
            console.error('Error storing posts:', error);
            res.status(500).json({
                message: 'Failed to store posts',
                error: error.message,
                details: error.response?.data || 'No additional error details'
            });
        }
    },
    async getAllPosts(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: posts } = await Post.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        const totalPages = Math.ceil(count / limit);

        // Extract the `data` column from each post
        const dataFields = posts.map(post => post.data);

        res.json({
            posts: {
                data: posts, // Nesting posts inside a `data` object
            },
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            },
            data: dataFields, // Sending the `data` column separately
            print: "Hello"
        });

    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            message: 'Failed to fetch posts',
            error: error.message
        });
    }
    },
    async updatePost(req, res) {
        try {
            const { id } = req.params;
            const { isFavorite, isEmailSent } = req.body;

            const post = await Post.findByPk(id);
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            await post.update({
                isFavorite: isFavorite !== undefined ? isFavorite : post.isFavorite,
                isEmailSent: isEmailSent !== undefined ? isEmailSent : post.isEmailSent
            });

            res.json({
                message: 'Post updated successfully',
                post
            });

        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({
                message: 'Failed to update post',
                error: error.message
            });
        }
    },
    async searchPosts(req, res) {
        try {
            const {
                query,
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                filters = {}
            } = req.query;

            const offset = (page - 1) * limit;

            // Build search conditions
            const searchCondition = query ? {
                [Op.or]: [
                    // Search in JSON data fields
                    Sequelize.literal(`"data"->>'postTitle' ILIKE '%${query}%'`),
                    Sequelize.literal(`"data"->>'produce' ILIKE '%${query}%'`),
                    Sequelize.literal(`"data"->>'titleOfTheWork' ILIKE '%${query}%'`),
                    Sequelize.literal(`"data"->>'manager' ILIKE '%${query}%'`),
                    Sequelize.literal(`"data"->>'customerEmail' ILIKE '%${query}%'`),
                    // Add more fields as needed
                ]
            } : {};

            // Build filter conditions
            const filterConditions = {};
            if (filters.isFavorite !== undefined) {
                filterConditions.isFavorite = filters.isFavorite;
            }
            if (filters.isEmailSent !== undefined) {
                filterConditions.isEmailSent = filters.isEmailSent;
            }
            // Add more filters as needed

            const { count, rows: posts } = await Post.findAndCountAll({
                where: {
                    ...searchCondition,
                    ...filterConditions
                },
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset),
                attributes: [
                    'id',
                    'postId',
                    'comcardNo',
                    'isFavorite',
                    'isEmailSent',
                    'data',
                    'createdAt'
                ]
            });

            const totalPages = Math.ceil(count / limit);

            res.json({
                posts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPreviousPage: parseInt(page) > 1
                },
                filters: {
                    query,
                    sortBy,
                    sortOrder,
                    ...filters
                }
            });

        } catch (error) {
            console.error('Error searching posts:', error);
            res.status(500).json({
                message: 'Failed to search posts',
                error: error.message
            });
        }
    }
}; 