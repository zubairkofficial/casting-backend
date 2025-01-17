import { EmailTemplate, Post } from "../models/index.js";
import dotenv from "dotenv"; // Recommended for managing email credentials
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { UserEmail } from "../models/index.js";

dotenv.config();

export const emailTemplateController = {
  // Get all templates
  async getAllTemplates(req, res) {
    const id = req.user.id;
    try {
      const templates = await EmailTemplate.findAll({
        where: { createdBy: id },
        order: [["createdAt", "DESC"]],
      });
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({
        message: "Failed to fetch templates",
        error: error.message,
      });
    }
  },

  // Create new template
  async createTemplate(req, res) {
    try {
      const { title, template,subject } = req.body;
      const userId = req.user.id;
      // Extract variables from content using regex
      const variableRegex = /\[(.*?)\]/g;
      const variables = [
        ...new Set(
          Array.from(template.matchAll(variableRegex)).map((match) => match[1])
        ),
      ];

      const content = await EmailTemplate.create({
        title,
        template,
        variables,
        subject,
        createdBy: userId
      });

      res.status(201).json(content);

    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({
        message: "Failed to create template",
        error: error.message,
      });
    }
  },

  // Update template
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { title, template, subject } = req.body;

      const content = await EmailTemplate.findByPk(id);
      if (!content) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Extract variables from content
      const variableRegex = /\[(.*?)\]/g;
      const variables = [
        ...new Set(
          Array.from(template.matchAll(variableRegex)).map((match) => match[1])
        ),
      ];

      await content.update({
        title,
        template,
        variables,
        subject,
      });

      res.json(content);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({
        message: "Failed to update template",
        error: error.message,
      });
    }
  },

  // Delete template
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;

      const content = await EmailTemplate.findByPk(id);
      if (!content) {
        return res.status(404).json({ message: "Template not found" });
      }

      await content.destroy();
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({
        message: "Failed to delete template",
        error: error.message,
      });
    }
  },

  // Get single template
  async getTemplateById(req, res) {
    try {
      const { id } = req.params;

      const content = await EmailTemplate.findByPk(id);
      if (!content) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json(content);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({
        message: "Failed to fetch template",
        error: error.message,
      });
    }
  },

  async sendEmail(req, res) {
    try {
      const { recipient, subject, content, accountId, postId } = req.body;
  
      // Validate input
      if (!recipient || !content || !accountId) {
        return res.status(400).json({
          message: "Recipient, content, and accountId are required",
        });
      }
      if (!postId) {
        return res.status(400).json({
          message: "PostId is required",
        });
      }
  
      // Get the user's Gmail account credentials
      const userEmail = await UserEmail.findOne({
        where: {
          id: accountId,
          createdBy: req.user.id,
        },
      });
  
      if (!userEmail || !userEmail.accessToken) {
        return res.status(400).json({
          message: "Gmail account not found or not properly connected",
        });
      }
  
      // Create OAuth2 client
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_API_URL}google-auth/callback`
      );
  
      oauth2Client.setCredentials({
        access_token: userEmail.accessToken,
        refresh_token: userEmail.refreshToken,
      });
  
      // Create Gmail API client
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  
      // Prepare the email message with proper MIME type
      const emailContent = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=utf-8",
        `From: ${userEmail.email}`,
        `To: ${recipient}`,
        `Subject: ${subject || "No Subject"}`,
        "",
        content, // The HTML content will now be rendered properly
      ].join("\n");
  
      // Encode the email in base64
      const encodedMessage = Buffer.from(emailContent)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
  
      // Send the email using Gmail API
      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });
  
      // Update the post status
      const post = await Post.findOne({
        where: { postId: postId },
      });
      if (post) {
        post.isEmailSent = true;
        await post.save();
      }
  
      res.status(200).json({
        message: "Email sent successfully",
        messageId: response.data.id,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({
        message: "Failed to send email",
        error: error.message,
      });
    }
  }


};
