import dotenv from "dotenv"; // Import dotenv to load environment variables
import pkg from "pg";
import { UUIDV4 } from "sequelize";
const { Pool } = pkg;
// Load environment variables from .env file
dotenv.config();

// Create a connection pool
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "casting",
  password: "12345678",
  port: process.env.DB_PORT || 5432, // Default PostgreSQL port is 5432
});

// Function to insert an admin user
const insertAdminUser = async () => {
  // Step 1: Define admin user data
  const adminUserData = {
    name: "Admin",
    email: "admin@gmail.com",
    password: "$2b$10$gMOpXY1xua6q7n27cSW8cu6uLb6M7GOWAbGOWj6REc7hLK9t6hjwy", // In a real-world scenario, hash the password
    username: "admin",
    isActive: true,
    role: "admin",
  };

  // Step 2: Insert the admin user into the database
  const query = `
    INSERT INTO users (id, name, email, password, username, "isActive", role, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    adminUserData.id  = '4c20ea21-f70e-4bb8-9b2c-3acba1d2fb5c',
    adminUserData.name,
    adminUserData.email,
    adminUserData.password,
    adminUserData.username,
    adminUserData.isActive,
    adminUserData.role,
    adminUserData.createdAt = new Date(),
    adminUserData.updatedAt = new Date()
  ];

  try {
    // Connect to the database using the pool
    const client = await pool.connect();

    // Execute the query
    const result = await client.query(query, values);

    // Log the created admin user
    console.log("Admin user created successfully:", result.rows[0]);

    // Release the client back to the pool
    client.release();
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error inserting admin user:", error);
  } finally {
    // Close the connection pool
    await pool.end();
    console.log("Database connection pool closed.");
  }
};

// Execute the function to insert the admin user
insertAdminUser();
