// controllers/authController.js
import { User } from '../models/index.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

// Function to send confirmation email

const sendConfirmationEmail = async (user) => {
    const token = String(crypto.randomBytes(32).toString('hex')); // Generate a unique token
    const verificationUrl = `${process.env.BACKEND_API_URL}auth/verify-email?token=${token}&email=${user.email}`;

    // Store the token in the user record for later verification (you might want to add a new field in your User model)
    user.verificationToken = token; // Make sure to update your User model to store this token
    await user.save();

    const transporter = nodemailer.createTransport({
        host: 'smtp.titan.email',
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
        },
    });

    const emailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 30px;
            text-align: center;
        }
        .email-header {
            background-color: #007bff;
            color: white;
            padding: 15px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px;
        }
        .verify-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #28a745;
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin-top: 20px;
            transition: background-color 0.3s ease;
        }
        .verify-button:hover {
            background-color: #218838;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Robot Questionnaire</h1>
        </div>
        
        <h2>Welcome Aboard!</h2>
        
        <p>Thank you for signing up for Robot Questionnaire. To get started and secure your account, please verify your email address by clicking the button below.</p>
        
        <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
        
        <p>If you didn't create an account, you can safely ignore this email.</p>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} Robot Questionnaire. All rights reserved.</p>
            <p>If you're having trouble, copy and paste this link into your browser: <br>${verificationUrl}</p>
        </div>
    </div>
</body>
</html>
    `;

    const mailOptions = {
        from: process.env.MAIL_FROM_ADDRESS,
        to: user.email,
        subject: 'Verify Your Email for Finance Game',
        html: emailTemplate // Assuming you'll define the template as shown above
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Error sending email: ${error.message}`);
    }
};


export const signup = async (req, res) => {
    const { name, email, password, username, role } = req.body;


    // Validate password length
    try {
        // Check if email already exists
        const existingUserByEmail = await User.findOne({ where: { email } });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Email is already in use.' });
        }

        // Check if username already exists
        const existingUserByUsername = await User.findOne({ where: { username } });
        if (existingUserByUsername) {
            return res.status(400).json({ message: 'Username is already taken.' });
        }

        // Create the user
        const newUser = await User.create({
            name,
            email,
            username,
            password, // Assuming the User model has a hook to hash the password automatically
            role,
        });

        // Send confirmation email
        await sendConfirmationEmail(newUser);

        // Send success response
        res.status(201).json({
            message: 'Signed up successfully. Please check your email for verification.',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                isActive: newUser.isActive,
                role: newUser.role,
            },
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};
export const verifyEmail = async (req, res) => {
    const { token, email } = req.query;

    try {
        // Find the user with the given email and token
        const user = await User.findOne({ where: { email, verificationToken: token } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification link.' });
        }

        // Activate the user account
        user.isActive = true;
        user.verificationToken = null; // Clear the token after verification
        await user.save();

        // Redirect to the frontend login page
        res.redirect(`${process.env.FRONTEND_BASE_URL}login`); // Adjust the URL as needed
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

export const signin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if the account is active
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is not activated. Please verify your email.' });
        }

        // Check the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a token (optional, if you want to use JWT for session management)
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '12h' });

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                isActive: user.isActive,
                role: user.role
            },
            token, // Send the token back if needed
        });
    } catch (error) {
        console.error('Error signing in:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};