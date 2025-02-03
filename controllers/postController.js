import { google } from "googleapis";
import { UserEmail, Post, User } from "../models/index.js";
import sequelize from "../models/index.js";

export const postController = {
  async storePosts(req, res) {
    try {
      const userId = req.user.id;
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

        // Parse the postDate string into a Date object (if available)
        let postDate = null;
        if (postData.postDate) {
          const postDateString = postData.postDate; // e.g., "2024년 11월 13일 7:11:28" or "2024년 11월 13일 17:11:28"
          const dateParts = postDateString.match(/(\d{4})년 (\d{2})월 (\d{2})일 (\d{1,2}):(\d{2}):(\d{2})/);

          if (dateParts) {
            const [_, year, month, day, hour, minute, second] = dateParts;
            postDate = new Date(
              parseInt(year),
              parseInt(month) - 1, // Months are 0-indexed in JavaScript
              parseInt(day),
              parseInt(hour),
              parseInt(minute),
              parseInt(second)
            );
          } else {
            // Try alternative date formats
            const date = new Date(postDateString);
            if (!isNaN(date.getTime())) {
              postDate = date;
            } else {
              console.warn(`Invalid date format: ${postDateString}`);
            }
          }
        }

        return {
          postId: postData.postId,
          postDate: postDate ? postDate.toISOString() : null, // Convert to ISO string or null
          isFavorite: false,
          isEmailSent: false,
          data: {
            ...postData,
            postDate: postDate ? postDate.toISOString() : null // Also store the ISO string in data
          },
          createdBy: userId,
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
    const id = req.user.id;
    console.log("Req id", id);
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows: posts } = await Post.findAndCountAll({
        where: { createdBy: id },
        limit,
        offset,
        order: [["postDate", "DESC"]],
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
        data: dataFields, 
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
      const limit = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * limit;

      const { count, rows: posts } = await Post.findAndCountAll({
        where: { isEmailSent: true, createdBy: req.user.id },
        limit,
        offset,
        order: [["postDate", "DESC"]],
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
        where: { isFavorite: true,  createdBy: req.user.id  },
        limit,
        offset,
        order: [["postDate", "DESC"]],
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
        data: dataFields, 
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

  async addMemo(req, res) {
    try {
      const { id } = req.params;
      const { memo } = req.body;

      const post = await Post.findOne({ where: { postId: id } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (memo) {
        await post.update({
          memo: memo,
        });
      }
      res.json({
        message: "Memo added successfully",
        post,
      });
    } catch (error) {
      console.error("Error adding memo:", error);
      res.status(500).json({
        message: "Failed to add memo",
        error: error.message,
      });
    }
  },

  async searchPosts(req, res) {
    try {
      const {
        query,
        sortBy = "postDate",
        sortOrder = "DESC",
        page = 1,
        pageSize = 50,
        filter,
      } = req.query;

      // Convert page and pageSize to integers and set default values if necessary
      const currentPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
      const limit = parseInt(pageSize, 10) > 0 ? parseInt(pageSize, 10) : 10;
      const offset = (currentPage - 1) * limit;

      // Validate sortBy and sortOrder
      const allowedSortFields = ["createdAt", "updatedAt", "id", "postDate"];
      const allowedSortOrders = ["ASC", "DESC"];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      // Modify the ILIKE query to include filter conditions
      let whereConditions = [`"createdBy" = :userId`];
      let replacements = { 
        query,
        userId: req.user.id,
        limit,
        offset
      };

      // Add the search conditions
      whereConditions.push(`(
        data::text ILIKE '%' || :query || '%' OR
        data->>'body' ILIKE '%' || :query || '%' OR
        data->>'postTitle' ILIKE '%' || :query || '%' OR
        data->>'description' ILIKE '%' || :query || '%' OR
        data->>'postDate' ILIKE '%' || :query || '%' OR
        data->>'titleOfTheWork' ILIKE '%' || :query || '%' OR 
        data->>'roleInThePlay' ILIKE '%' || :query || '%' OR
        data->>'manager' ILIKE '%' || :query || '%' OR
        data->>'phoneCall' ILIKE '%' || :query || '%' OR
        data->>'appearanceFee' ILIKE '%' || :query || '%'
      )`);

      // Add filter condition if provided
      if (filter) {
        whereConditions.push(
          `(data ? 'recruitmentGender' AND data->>'recruitmentGender' = :filter)`
        );
        replacements.filter = filter;
      }

      const whereClause = whereConditions.join(' AND ');

      // Update SQL queries to use the new where clause
      const sqlQuery = `
        SELECT *
        FROM public.posts
        WHERE ${whereClause}
        ORDER BY "${validSortBy}" ${validSortOrder}
        LIMIT :limit OFFSET :offset
      `;

      const countQuery = `
        SELECT COUNT(*) AS count
        FROM public.posts
        WHERE ${whereClause}
      `;

      // Execute count query with correct destructuring
      const [{ count }] = await sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      // Execute select query
      const posts = await sequelize.query(sqlQuery, {
        replacements,
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
        sortBy = "postDate",
        sortOrder = "DESC",
        page = 1,
        pageSize = 50,
      } = req.query;

      // Convert page and pageSize to integers and set default values if necessary
      const currentPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
      const limit = parseInt(pageSize, 10) > 0 ? parseInt(pageSize, 10) : 50;
      const offset = (currentPage - 1) * limit;

      // Validate sortBy and sortOrder
      const allowedSortFields = ["createdAt", "updatedAt", "id", "postDate"];
      const allowedSortOrders = ["ASC", "DESC"];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      // Build WHERE conditions
      let whereConditions = ['\"createdBy\" = :userId'];
      let replacements = { userId: req.user.id };

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
          itemsPerPage: limit,
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

  async dateFilter(req, res) {
    try {
      const {
        startDate,
        endDate,
        activeFilter,
        page = 1,
        pageSize = 50,
        sortBy = "postDate",
        sortOrder = "DESC",
      } = req.query;

      // Validate required date parameters
      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "Both startDate and endDate are required in MM-DD-YYYY format.",
        });
      }

      // Validate date formats using regex
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({
          error: "startDate and endDate must be in YYYY-MM-DD format.",
        });
      }

      // Convert to Date objects and validate logical order
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
          error: "Invalid startDate or endDate provided.",
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: "startDate cannot be after endDate.",
        });
      }

      // Pagination calculations with consistent parsing
      const currentPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
      const limit = parseInt(pageSize, 10) > 0 ? parseInt(pageSize, 10) : 10;
      const offset = (currentPage - 1) * limit;

      // Validate sortBy and sortOrder
      const allowedSortFields = ["createdAt", "updatedAt", "id", "postDate"];
      const allowedSortOrders = ["ASC", "DESC"];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      // Build WHERE conditions
      let whereConditions = [
        'CAST(data->>\'postDate\' AS TIMESTAMP)::date BETWEEN :startDate AND :endDate',
        '"createdBy" = :userId'
      ];
      
      let replacements = {
        startDate, 
        endDate,
        userId: req.user.id,
        limit,
        offset
      };

      // Add active filter condition if provided and not "All"
      if (activeFilter && activeFilter !== "All") {
        whereConditions.push(
          `(data ? 'recruitmentGender' AND data->>'recruitmentGender' = :activeFilter)`
        );
        replacements.activeFilter = activeFilter;
      }

      const whereClause = whereConditions.join(' AND ');

      // SQL Query with filter conditions
      const sqlQuery = `
        SELECT *
        FROM public.posts
        WHERE ${whereClause}
        ORDER BY "${validSortBy}" ${validSortOrder}
        LIMIT :limit OFFSET :offset
      `;

      // SQL Query to count total matching records
      const countQuery = `
        SELECT COUNT(*) AS count
        FROM public.posts
        WHERE ${whereClause}
      `;

      // Execute count query
      const [{ count }] = await sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      
      const totalItems = parseInt(count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      // Execute select query
      const posts = await sequelize.query(sqlQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      // Return response with consistent structure
      res.json({
        posts: { data: posts },
        pagination: {
          currentPage,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
        activeFilters: {
          dateRange: { startDate, endDate },
          activeFilter: activeFilter || null
        },
        data: posts.map(post => post.data)
      });
    } catch (error) {
      console.error("Error filtering posts by date:", error);
      res.status(500).json({
        message: "Failed to filter posts by date",
        error: error.message,
      });
    }
  },

  async getFilteredPosts(req, res) {
    try {
      const {
        query,
        activeFilter,
        startDate,
        endDate,
        sortBy = "postDate",
        sortOrder = "DESC",
        page = 1,
        pageSize = 50,
      } = req.query;

      // Convert page and pageSize to integers
      const currentPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
      const limit = parseInt(pageSize, 10) > 0 ? parseInt(pageSize, 10) : 50;
      const offset = (currentPage - 1) * limit;

      // Validate sortBy and sortOrder
      const allowedSortFields = ["createdAt", "updatedAt", "id", "postDate"];
      const allowedSortOrders = ["ASC", "DESC"];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
      const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      // Build WHERE conditions
      let whereConditions = ['\"createdBy\" = :userId'];
      let replacements = { userId: req.user.id };

      // Add query search condition if provided
      if (query) {
        whereConditions.push(`(
          data::text ILIKE '%' || :query || '%' OR
          data->>'body' ILIKE '%' || :query || '%' OR
          data->>'postTitle' ILIKE '%' || :query || '%' OR
          data->>'description' ILIKE '%' || :query || '%' OR
          data->>'postDate' ILIKE '%' || :query || '%' OR
          data->>'titleOfTheWork' ILIKE '%' || :query || '%' OR 
          data->>'roleInThePlay' ILIKE '%' || :query || '%' OR
          data->>'manager' ILIKE '%' || :query || '%' OR
          data->>'phoneCall' ILIKE '%' || :query || '%' OR
          data->>'appearanceFee' ILIKE '%' || :query || '%'
        )`);
        replacements.query = query;
      }

      // Add active filter if provided
      if (activeFilter) {
        whereConditions.push(
          `(data ? 'recruitmentGender' AND data->>'recruitmentGender' = :activeFilter)`
        );
        replacements.activeFilter = activeFilter;
      }

      // Add date range filter if both dates are provided
      if (startDate && endDate) {
        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
          return res.status(400).json({
            error: "startDate and endDate must be in YYYY-MM-DD format.",
          });
        }

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start) || isNaN(end)) {
          return res.status(400).json({
            error: "Invalid startDate or endDate provided.",
          });
        }
        if (start > end) {
          return res.status(400).json({
            error: "startDate cannot be after endDate.",
          });
        }

        whereConditions.push(
          `CAST(data->>'postDate' AS TIMESTAMP)::date BETWEEN :startDate AND :endDate`
        );
        replacements.startDate = startDate;
        replacements.endDate = endDate;
      }

      const whereClause = whereConditions.join(" AND ");

      // Construct SQL query
      const sqlQuery = `
        SELECT *
        FROM public.posts
        WHERE ${whereClause}
        ORDER BY "${validSortBy}" ${validSortOrder}
        LIMIT :limit OFFSET :offset
      `;

      // Add pagination parameters to replacements
      replacements.limit = limit;
      replacements.offset = offset;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) AS count
        FROM public.posts
        WHERE ${whereClause}
      `;

      // Execute queries
      const [countResult] = await sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      const posts = await sequelize.query(sqlQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      // Calculate pagination metadata
      const totalItems = parseInt(countResult.count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      // Return response with active filters included
      res.json({
        posts: { data: posts },
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage: limit,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
        activeFilters: {
          query: query || null,
          activeFilter: activeFilter || null,
          dateRange: startDate && endDate ? { startDate, endDate } : null
        },
        data: posts.map(post => post.data)
      });
    } catch (error) {
      console.error("Error filtering posts:", error);
      res.status(500).json({ 
        message: "Failed to filter posts", 
        error: error.message 
      });
    }
  },

};
