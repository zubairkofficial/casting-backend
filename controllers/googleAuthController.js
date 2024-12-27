import { google } from "googleapis";
import { UserEmail, User } from "../models/index.js";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_API_URL}google-auth/callback`
);

export const googleAuthController = {
  async handleCallback(req, res) {
    try {
      const { code } = req.query;

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      console.log("User Info:", userInfo.data);

      // Initialize Google Drive
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      // Test Drive access by listing files (optional)
      const driveResponse = await drive.files.list({
        pageSize: 10,
        fields: "nextPageToken, files(id, name)",
      });
      console.log("Drive Files:", driveResponse.data.files);

      const user = await User.create({
        name: userInfo.data.given_name + " " + userInfo.data.family_name,
        email: userInfo.data.email,
        password: "12345678",
        username: userInfo.data.email,
        role: "user",
        isActive: true,
      });

      const admin = await User.findOne({
        where: {
          role: 'admin',
        }});

      // Store in database with Drive tokens
      const emailAccount = await UserEmail.create({
        email: userInfo.data.email,
        name: userInfo.data.given_name + " " + userInfo.data.family_name,
        picture: userInfo.data.picture,
        createdBy: admin.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date),
      });

      return res.redirect(
        `${process.env.FRONTEND_BASE_URL}admin/email-accounts`
      );
    } catch (error) {
      console.error("Error handling Google callback:", error);
      return res.redirect(`${process.env.FRONTEND_BASE_URL}error`);
    }
  },

  async connectAccount(req, res) {
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/drive",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/spreadsheets",
        ],
        prompt: "consent",
      });

      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  },

  async getConnectedAccounts(req, res) {
    try {
      const accounts = await UserEmail.findAll({
        where: { createdBy: req.user.id },
      });

      res.json(accounts);
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      res.status(500).json({ message: "Failed to fetch connected accounts" });
    }
  },

  async disconnectAccount(req, res) {
    try {
      const { id } = req.params;

      const user = await UserEmail.findAll({where: {id}});

      const email = user.email;
      await UserEmail.destroy({
        where: {
          id,
          createdBy: req.user.id,
        },
      });
      await User.destroy({
        where: {
          email,
        },
      });

      res.json({ message: "Account disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting account:", error);
      res.status(500).json({ message: "Failed to disconnect account" });
    }
  },

  async getGoogleDriveFiles(req, res) {
    try {
      const { folderId = "root" } = req.query;
      const { accountId } = req.params;

      // Get the email account with tokens
      const emailAccount = await UserEmail.findOne({
        where: {
          id: accountId,
        },
      });

      if (!emailAccount) {
        return res.status(404).json({ message: "Email account not found" });
      }

      // Create drive client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_API_URL}google-auth/callback`
      );

      oauth2Client.setCredentials({
        access_token: emailAccount.accessToken,
        refresh_token: emailAccount.refreshToken,
        expiry_date: emailAccount.tokenExpiry,
      });

      const drive = google.drive({ version: "v3", auth: oauth2Client });

      // List files with detailed information
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 100,
        orderBy: "folder,name",
        fields: "files(id, name, mimeType, thumbnailLink,modifiedTime)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });


      console.log(response);
      // If tokens were refreshed, update them
      const tokens = oauth2Client.credentials;
      if (tokens.access_token !== emailAccount.accessToken) {
        await emailAccount.update({
          accessToken: tokens.access_token,
          tokenExpiry: new Date(tokens.expiry_date),
        });
      }

      res.json(response.data.files);
    } catch (error) {
      console.error("Error fetching Drive files:", error);
      res.status(500).json({
        message: "Failed to fetch Drive files",
        error: error.message,
      });
    }
  },
};
