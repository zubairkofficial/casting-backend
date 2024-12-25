import { google } from 'googleapis';
import { UserEmail } from '../models/index.js';

export const jobPostingController = {
    async getJobPostings(req, res) {
        try {
            const spreadsheetId = '1HxprXaFnGm7c4CbZfuWHTWdRyOKA8Da2YuKurvcu5lk';
            const sheetName = 'testing';

            const { accountId } = req.params;

            // Get the email account with tokens
            const emailAccount = await UserEmail.findOne({
                where: { id: accountId }
            });

            if (!emailAccount) {
                return res.status(404).json({ message: 'Email account not found' });
            }

            if (!emailAccount.accessToken) {
                return res.status(400).json({ message: 'No access token found for this account' });
            }

            // Create new oauth2Client instance
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                `${process.env.BACKEND_API_URL}google-auth/callback`
            );

            // Set credentials
            oauth2Client.setCredentials({
                access_token: emailAccount.accessToken,
                refresh_token: emailAccount.refreshToken,
                expiry_date: new Date(emailAccount.tokenExpiry).getTime()
            });

            const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

            console.log("Sheets ", sheets)

            // Spreadsheet ID from the URL

            // Use proper range format
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: sheetName,  // Modified to use proper range format
            });

            console.log("Response ", response)

            const rows = response.data.values;

            if (!rows || rows.length === 0) {
                return res.status(404).json({ message: 'No data found.' });
            }

            // Convert headers to camelCase and create job posting objects
            const headers = rows[0].map(header => {
                return header
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
            });
            const jobPostings = rows.slice(1).map(row => {
                const posting = {};
                headers.forEach((header, index) => {
                    posting[header] = row[index] || '';
                });
                return posting;
            });

            // If tokens were refreshed, update them in the database
            const tokens = oauth2Client.credentials;
            if (tokens.access_token !== emailAccount.accessToken) {
                await emailAccount.update({
                    accessToken: tokens.access_token,
                    tokenExpiry: new Date(tokens.expiry_date)
                });
            }

            res.json(jobPostings);
        } catch (error) {
            // Enhanced error handling
            console.error('Error fetching job postings:', error);

            // Check for token expiration
            if (error.code === 401) {
                return res.status(401).json({
                    message: 'Authentication failed. Token might be expired.',
                    error: error.message
                });
            }

            res.status(error.code || 500).json({
                message: 'Failed to fetch job postings',
                error: error.message,
                details: error.response?.data || 'No additional error details'
            });
        }
    }
};