// userController.js
import { User } from '../models/index.js';
import bcrypt from 'bcrypt';

export const userController = {
    // Create a new user
    async create(req, res) {
        try {
            const { name, email, password, username, role = 'admin' } = req.body;

            // Check if email already exists
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(400).json({
                    message: 'Email already in use'
                });
            }

            if (username.length < 4) {
                return res.status(400).json({
                    message: 'Username must be 4 characters long'
                });
            }


            // Check if username already exists
            const existingUsername = await User.findOne({ where: { username } });
            if (existingUsername) {
                return res.status(400).json({
                    message: 'Username already taken'
                });
            }

            // Hash the password before storing
      

            const user = await User.create({
                name,
                email,
                password,
                username,
                role,
                isActive: true // Set to false if you want email verification
            });

            // Remove sensitive data before sending response
            const userResponse = {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                isActive: user.isActive
            };

            res.status(201).json({
                message: 'User created successfully',
                user: userResponse
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({
                message: 'Failed to create user',
                error: error.message
            });
        }
    },

    // Get all users (with pagination)
    async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows: users } = await User.findAndCountAll({
                attributes: ['id', 'name', 'email', 'username', 'role', 'isActive', 'createdAt'],
                where: { isActive: true, role: ['admin', 'user'] }, // Only fetch active users
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json({
                users,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalUsers: count
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                message: 'Failed to fetch users',
                error: error.message
            });
        }
    },

    // Get a single user by ID
    async getOne(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findByPk(id, {
                attributes: ['id', 'name', 'email', 'username', 'role', 'isActive', 'createdAt']
            });

            if (!user || !user.isActive) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            res.status(200).json({ user });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({
                message: 'Failed to fetch user',
                error: error.message
            });
        }
    },

    // Update a user
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, email, username, role, password } = req.body;

            const user = await User.findByPk(id);

            if (!user || !user.isActive) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Check email uniqueness if it's being updated
            if (email && email !== user.email) {
                const existingEmail = await User.findOne({ where: { email } });
                if (existingEmail) {
                    return res.status(400).json({
                        message: 'Email already in use'
                    });
                }
            }

            // Check username uniqueness if it's being updated
            if (username && username !== user.username) {
                const existingUsername = await User.findOne({ where: { username } });
                if (existingUsername) {
                    return res.status(400).json({
                        message: 'Username already taken'
                    });
                }
            }

            // Prepare update data
            const updateData = {
                ...(name && { name }),
                ...(email && { email }),
                ...(username && { username }),
                ...(role && { role })
            };

            // Hash the new password if provided
            if (password) {
                updateData.password = password
            }

            await user.update(updateData);

            // Get updated user without sensitive data
            const updatedUser = await User.findByPk(id, {
                attributes: ['id', 'name', 'email', 'username', 'role', 'isActive', 'createdAt']
            });

            res.status(200).json({
                message: 'User updated successfully',
                user: updatedUser
            });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({
                message: 'Failed to update user',
                error: error.message
            });
        }
    },

    // Delete (soft delete) a user by ID
    async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Find the user by ID
            const user = await User.findByPk(id);

            // Check if user exists and is active
            if (!user || !user.isActive) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Perform soft delete by setting isActive to false
            await user.update({ isActive: false });

            res.status(200).json({
                message: 'User deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({
                message: 'Failed to delete user',
                error: error.message
            });
        }
    }
};
