import { User, UserEmail } from '../models/index.js';

export const userEmailController = {
    // Create a new email account for a user
    async create(req, res) {
        try {
            const { email } = req.body;
            const userId = req.user.id; // Assuming you have authentication middleware

            // Check if email already exists for this user
            const existingEmail = await UserEmail.findOne({
                where: {
                    email,
                    createdBy: userId
                }
            });

            if (existingEmail) {
                return res.status(400).json({
                    message: 'This email is already registered for this user'
                });
            }

            const userEmail = await UserEmail.create({
                email,
                createdBy: userId
            });

            res.status(201).json({
                message: 'Email account added successfully',
                userEmail
            });
        } catch (error) {
            console.error('Error creating email account:', error);
            res.status(500).json({
                message: 'Failed to create email account',
                error: error.message
            });
        }
    },

    // Get all email accounts for a user
    async getAllByUser(req, res) {
        try {
            const userId = req.user.id;

            const userEmails = await UserEmail.findAll({
                where: { createdBy: userId },
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                }]
            });

            res.status(200).json(
                userEmails
            );
        } catch (error) {
            console.error('Error fetching email accounts:', error);
            res.status(500).json({
                message: 'Failed to fetch email accounts',
                error: error.message
            });
        }
    },

    // Get a specific email account
    async getOne(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const userEmail = await UserEmail.findOne({
                where: {
                    id,
                    createdBy: userId
                },
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                }]
            });

            if (!userEmail) {
                return res.status(404).json({
                    message: 'Email account not found'
                });
            }

            res.status(200).json({
                userEmail
            });
        } catch (error) {
            console.error('Error fetching email account:', error);
            res.status(500).json({
                message: 'Failed to fetch email account',
                error: error.message
            });
        }
    },

    // Update an email account
    async update(req, res) {
        try {
            const { id } = req.params;
            const { email } = req.body;
            const userId = req.user.id;

            const userEmail = await UserEmail.findOne({
                where: {
                    id,
                    createdBy: userId
                }
            });

            if (!userEmail) {
                return res.status(404).json({
                    message: 'Email account not found'
                });
            }

            await userEmail.update({ email });

            res.status(200).json({
                message: 'Email account updated successfully',
                userEmail
            });
        } catch (error) {
            console.error('Error updating email account:', error);
            res.status(500).json({
                message: 'Failed to update email account',
                error: error.message
            });
        }
    },

    // Delete an email account
    async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const userEmail = await UserEmail.findOne({
                where: {
                    id,
                    createdBy: userId
                }
            });

            if (!userEmail) {
                return res.status(404).json({
                    message: 'Email account not found'
                });
            }

            await userEmail.destroy(); // This will perform a soft delete since paranoid is true

            res.status(200).json({
                message: 'Email account deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting email account:', error);
            res.status(500).json({
                message: 'Failed to delete email account',
                error: error.message
            });
        }
    }
};
