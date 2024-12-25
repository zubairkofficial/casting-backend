import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { addHours } from 'date-fns';

class AuthService {
    constructor(userModel) {
        this.userModel = userModel;
        this.accessTokenExpiry = '15m';  // 15 minutes
        this.refreshTokenExpiry = '7d';  // 7 days
    }

    generateTokens(user) {
        // Generate access token
        const accessToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: this.accessTokenExpiry }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenExpiresAt = addHours(new Date(), 24 * 7); // 7 days

        return {
            accessToken,
            refreshToken,
            refreshTokenExpiresAt,
            accessTokenExpiresAt: addHours(new Date(), 0.25) // 15 minutes
        };
    }

    async login(email, password) {
        const user = await this.userModel.findOne({ where: { email } });
        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await user.isValidPassword(password);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        const tokens = this.generateTokens(user);

        // Update user with refresh token
        await user.update({
            refreshToken: tokens.refreshToken,
            refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            ...tokens
        };
    }

    async refreshToken(refreshToken) {
        const user = await this.userModel.findOne({
            where: {
                refreshToken,
                refreshTokenExpiresAt: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!user) {
            throw new Error('Invalid refresh token');
        }

        const tokens = this.generateTokens(user);

        // Update user with new refresh token
        await user.update({
            refreshToken: tokens.refreshToken,
            refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt
        });

        return tokens;
    }

    async logout(userId) {
        await this.userModel.update(
            {
                refreshToken: null,
                refreshTokenExpiresAt: null,
                accessTokenExpiresAt: null
            },
            {
                where: { id: userId }
            }
        );
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }
}

export default AuthService; 