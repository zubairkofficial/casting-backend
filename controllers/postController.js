import { google } from "googleapis";
import { UserEmail, Post } from "../models/index.js";
import sequelize from "../models/index.js";

export const postController = {
  async storePosts(req, res) {
    try {
      const { spreadsheetId, sheetName, accountId } = req.params;

      // Get the email account with tokens
      const emailAccount = await UserEmail.findOne({
        where: { id: accountId },
      });

      if (!emailAccount) {
        return res.status(404).json({ message: "Email account not found" });
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
        expiry_date: new Date(emailAccount.tokenExpiry).getTime(),
      });

      const sheets = google.sheets({ version: "v4", auth: oauth2Client });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "No data found." });
      }

      // Convert headers and create post objects
      const headers = rows[0].map((header) =>
        header
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      );

      const posts = rows.slice(1).map((row) => {
        const postData = {};
        headers.forEach((header, index) => {
          postData[header] = row[index] || "";
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
      const existingEmails = new Set(existingPosts.map((post) => post.postId));

      const newPosts = posts.filter((post) => !existingEmails.has(post.postId));

      if (newPosts.length > 0) {
        await Post.bulkCreate(newPosts);
      }

      res.json({
        message: `Processed ${posts.length} posts. Added ${newPosts.length} new posts.`,
        newPosts: newPosts,
      });
    } catch (error) {
      console.error("Error storing posts:", error);
      res.status(500).json({
        message: "Failed to store posts",
        error: error.message,
        details: "No additional error details",
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
        order: [["createdAt", "DESC"]],
      });

      const totalPages = Math.ceil(count / limit);

      // Extract the `data` column from each post
      const dataFields = posts.map((post) => post.data);

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
          hasPreviousPage: page > 1,
        },
        data: dataFields, // Sending the `data` column separately
        
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({
        message: "Failed to fetch posts",
        error: error.message,
      });
    }
  },
  async getAllEmailedPosts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows: posts } = await Post.findAndCountAll({
        where: { isEmailSent: true },
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      });

      const totalPages = Math.ceil(count / limit);

      // Extract the `data` column from each post
      const dataFields = posts.map((post) => post.data);

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
          hasPreviousPage: page > 1,
        },
        data: dataFields, // Sending the `data` column separately
        
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({
        message: "Failed to fetch posts",
        error: error.message,
      });
    }
  },

  async getFavoritesPosts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows: posts } = await Post.findAndCountAll({
        where: { isFavorite: true },
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      });

      const totalPages = Math.ceil(count / limit);

      // Extract the `data` column from each post
      const dataFields = posts.map((post) => post.data);

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
          hasPreviousPage: page > 1,
        },
        data: dataFields, // Sending the `data` column separately
        print: "Hello",
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({
        message: "Failed to fetch posts",
        error: error.message,
      });
    }
  },

  async updatePost(req, res) {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;

      const post = await Post.findOne({ where: { postId: id } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      await post.update({
        isFavorite: isFavorite !== undefined ? isFavorite : post.isFavorite,
      });

      res.json({
        message: "Post Added to favourites successfully",
        post,
      });
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({
        message: "Failed to update post",
        error: error.message,
      });
    }
  },

  async searchPosts(req, res) {
    try {
      const {
        query,
        sortBy = "createdAt",
        sortOrder = "DESC",
        page = 1,
        pageSize = 10,
      } = req.query;

      // Convert page and pageSize to integers and set default values if necessary
      const currentPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
      const limit = parseInt(pageSize, 10) > 0 ? parseInt(pageSize, 10) : 10;
      const offset = (currentPage - 1) * limit;

      // Validate sortBy and sortOrder
      const allowedSortFields = ["createdAt", "updatedAt", "id"];
      const allowedSortOrders = ["ASC", "DESC"];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      // Use ILIKE for case-insensitive pattern matching
      const ilikeQuery = `
        (data::text ILIKE '%' || :query || '%') OR
        (data->>'body' ILIKE '%' || :query || '%') OR
        (data->>'postTitle' ILIKE '%' || :query || '%') OR
        (data->>'description' ILIKE '%' || :query || '%') OR
        (data->>'postDate' ILIKE '%' || :query || '%') OR
        (data->>'titleOfTheWork' ILIKE '%' || :query || '%') OR 
        (data->>'roleInThePlay' ILIKE '%' || :query || '%') OR
        (data->>'manager' ILIKE '%' || :query || '%') OR
        (data->>'phoneCall' ILIKE '%' || :query || '%') OR
        (data->>'appearanceFee' ILIKE '%' || :query || '%') 
      `;

      // Construct SQL query with LIMIT and OFFSET
      const sqlQuery = `
        SELECT *
        FROM public.posts
        WHERE ${ilikeQuery}
        ORDER BY "${validSortBy}" ${validSortOrder}
        LIMIT :limit OFFSET :offset
      `;

      // Count total matching posts for pagination
      const countQuery = `
        SELECT COUNT(*) AS count
        FROM public.posts
        WHERE ${ilikeQuery}
      `;

      // Execute count query with correct destructuring
      const [{ count }] = await sequelize.query(countQuery, {
        replacements: { query },
        type: sequelize.QueryTypes.SELECT,
      });

      // Execute select query
      const posts = await sequelize.query(sqlQuery, {
        replacements: {
          query,
          limit,
          offset,
        },
        type: sequelize.QueryTypes.SELECT,
      });

      // Calculate pagination metadata
      const totalItems = parseInt(count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      // Return response with paginated posts
      res.json({
        posts: { data: posts },
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          pageSize: limit,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
      });
    } catch (error) {
      console.error("Error searching posts:", error);
      res
        .status(500)
        .json({ message: "Failed to search posts", error: error.message });
    }
  },
  async filterPosts(req, res) {
    try {
      // Extract query parameters
      const {
        recruitmentGender,
        sortBy = "createdAt",
        sortOrder = "DESC",
        page = 1,
        pageSize = 10,
      } = req.query;

      // Convert page and pageSize to integers and set default values if necessary
      const currentPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
      const limit = parseInt(pageSize, 10) > 0 ? parseInt(pageSize, 10) : 10;
      const offset = (currentPage - 1) * limit;

      // Validate sortBy and sortOrder
      const allowedSortFields = ["createdAt", "updatedAt", "id"];
      const allowedSortOrders = ["ASC", "DESC"];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      // Build WHERE conditions
      let whereConditions = [];
      let replacements = {};

      if (recruitmentGender) {
        whereConditions.push(
          `(data ? 'recruitmentGender' AND data->>'recruitmentGender' = :recruitmentGender)`
        );
        replacements.recruitmentGender = recruitmentGender;
      }

      const whereClause =
        whereConditions.length > 0 ? whereConditions.join(" AND ") : "TRUE";

      // Construct SQL query with LIMIT and OFFSET
      const sqlQuery = `
                SELECT *
                FROM public.posts
                WHERE ${whereClause}
                ORDER BY "${validSortBy}" ${validSortOrder}
                LIMIT :limit OFFSET :offset
            `;

      // Add limit and offset to replacements
      replacements.limit = limit;
      replacements.offset = offset;

      // Execute select query
      const [postsResult] = await sequelize.query(sqlQuery, {
        replacements,
      });
      const posts = postsResult;

      // Optionally, get the total count for pagination metadata
      const countQuery = `
                SELECT COUNT(*) AS count
                FROM public.posts
                WHERE ${whereClause}
            `;
      const [countResult] = await sequelize.query(countQuery, {
        replacements,
      });
      const totalItems = parseInt(countResult[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      // Return response with filtered and paginated posts
      res.json({
        posts: { data: posts },
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          pageSize: limit,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
      });
    } catch (error) {
      console.error("Error filtering posts:", error);
      res
        .status(500)
        .json({ message: "Failed to filter posts", error: error.message });
    }
  },
};
