import express from 'express';
import { google } from 'googleapis';
import { UserEmail, User } from '../models/index.js';

let id;

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_API_URL}google-auth/callback`
);

// Controller
export const googleAuthController ={
  // Step 1: Redirect user to Google OAuth consent screen
  async connectAccount(req, res) {
    try {
      const customData = { userId: req.user.id, customParam: 'someValue' };
      const state = Buffer.from(JSON.stringify(customData)).toString('base64'); // Encode data as base64
  
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/spreadsheets',
        ],
        prompt: 'consent',
        state: state, // Pass custom data in the state parameter
      });
  
      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({ message: 'Failed to generate auth URL' });
    }
  },

  // Step 2: Handle Google OAuth callback
  async handleCallback(req, res) {
    try {
      const { code, state } = req.query;
  
      if (!code) {
        return res.redirect(
          `${process.env.FRONTEND_BASE_URL}error?message=No authorization code provided`
        );
      }
  
      // Decode the state parameter
      const customData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      const { userId, customParam } = customData;
      console.log('Custom Data:', { userId, customParam });
  
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
  
      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      console.log('User Info:', userInfo.data);
  
      // Save account details to the database
      const emailAccount = await UserEmail.create({
        email: userInfo.data.email,
        name: `${userInfo.data.given_name} ${userInfo.data.family_name}`,
        picture: userInfo.data.picture,
        createdBy: userId, // Use the userId from the state parameter
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date),
      });
  
      // Redirect to frontend
      return res.redirect(
        `${process.env.FRONTEND_BASE_URL}admin/email-accounts`
      );
    } catch (error) {
      console.error('Error handling Google callback:', error);
      return res.redirect(
        `${process.env.FRONTEND_BASE_URL}error?message=${error.message}`
      );
    }
  },
  // Step 3: Get all connected accounts for the authenticated user
  async getConnectedAccounts(req, res) {
    try {
      const accounts = await UserEmail.findAll({
        where: { createdBy: req.user.id },
      });

      res.json(accounts);
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
      res.status(500).json({ message: 'Failed to fetch connected accounts' });
    }
  },

  // Step 4: Disconnect a connected account
  async disconnectAccount(req, res) {
    try {
      const { id } = req.params;

      const emailAccount = await UserEmail.findOne({
        where: { id, createdBy: req.user.id },
      });

      if (!emailAccount) {
        return res.status(404).json({ message: 'Account not found' });
      }

      await emailAccount.destroy();
      res.json({ message: 'Account disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting account:', error);
      res.status(500).json({ message: 'Failed to disconnect account' });
    }
  },

  // Step 5: Get Google Drive files for a connected account
  async getGoogleDriveFiles(req, res) {
    try {
      const { folderId = 'root' } = req.query;
      const { accountId } = req.params;
  
      // Get the email account with tokens
      const emailAccount = await UserEmail.findOne({
        where: { id: accountId, createdBy: req.user.id },
      });
  
      if (!emailAccount) {
        return res.status(404).json({ message: 'Email account not found' });
      }
  
      // Set credentials for OAuth2 client
      oauth2Client.setCredentials({
        access_token: emailAccount.accessToken,
        refresh_token: emailAccount.refreshToken,
        expiry_date: emailAccount.tokenExpiry,
      });
  
      // Function to fetch Drive files
      const fetchDriveFiles = async () => {
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        let allFiles = [];
        let pageToken = null;
  
        do {
          const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            pageSize: 100,
            orderBy: 'folder,name',
            fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, modifiedTime)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            pageToken: pageToken,
          });
  
          allFiles = allFiles.concat(response.data.files);
          pageToken = response.data.nextPageToken;
        } while (pageToken);
  
        return allFiles;
      };
  
      try {
        // Attempt to fetch Drive files
        const files = await fetchDriveFiles();
        res.json(files);
      } catch (error) {
        console.error('Error fetching Drive files:', error);
  
        // Check if the error is due to an invalid or expired token
        if (error.response?.status === 401 || error.message.includes('invalid_grant')) {
          console.log('Token expired or revoked. Attempting to refresh token...');
  
          try {
            // Refresh the token
            const { tokens } = await oauth2Client.refreshToken(emailAccount.refreshToken);
            console.log('New tokens received:', tokens);
  
            // Update the credentials
            oauth2Client.setCredentials(tokens);
  
            // Update the database with new tokens
            await emailAccount.update({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token || emailAccount.refreshToken, // Use existing refresh token if new one is not provided
              tokenExpiry: new Date(tokens.expiry_date).toISOString(),
            });
  
            console.log('Tokens updated in the database.');
  
            // Retry the request with new tokens
            const files = await fetchDriveFiles();
            res.json(files);
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
  
            // If token refresh fails, the refresh token might be invalid or revoked
            if (refreshError.message.includes('invalid_grant')) {
              return res.status(401).json({
                message: 'Token refresh failed. Please reauthenticate your Google account.',
              });
            } else {
              throw refreshError;
            }
          }
        } else {
          // Handle other errors
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in getGoogleDriveFiles:', error);
      res.status(500).json({
        message: 'Failed to fetch Drive files',
        error: error.message,
      });
    }
  },

  // Step 6: Reauthenticate an account
  async reauthenticateAccount(req, res) {
    try {
      const { accountId } = req.params;

      const emailAccount = await UserEmail.findOne({
        where: { id: accountId, createdBy: req.user.id },
      });

      if (!emailAccount) {
        return res.status(404).json({ message: 'Email account not found' });
      }

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/spreadsheets',
        ],
        prompt: 'consent',
      });

      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating reauthentication URL:', error);
      res.status(500).json({ message: 'Failed to generate reauthentication URL' });
    }
  },
};