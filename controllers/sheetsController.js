import { google } from 'googleapis';
import { UserEmail, Model } from '../models/index.js';

export const sheetsController = {


  async getSheetData(req, res) {
    try {
      const { spreadsheetId, sheetName, accountId } = req.params;

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

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'No data found.' });
      }

      // Get headers from first row
      const headers = rows[0].map(header =>
        header.toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      );

      // Convert rows to array of objects
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      // Find existing records and create only new ones
      const existingModels = await Model.findAll();
      const existingEmails = new Set(existingModels.map(model => model.email));

      const newData = data.filter(item => !existingEmails.has(item.email));

      if (newData.length > 0) {
        await Model.bulkCreate(newData);
      }

      res.json({
        message: `Processed ${data.length} records. Added ${newData.length} new records.`,
        newRecords: newData
      });
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      res.status(500).json({
        message: 'Failed to fetch sheet data',
        error: error.message,
        details: error.response?.data || 'No additional error details'
      });
    }
  },

  async getModels(req, res) {
    try {

      const models = await Model.findAll();
      res.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({
        message: 'Failed to fetch models',
        error: error.message,
        details: error.response?.data || 'No additional error details'
      });
    }
  }
}; 