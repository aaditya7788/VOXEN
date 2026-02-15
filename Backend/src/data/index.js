// Data layer - PostgreSQL Supabase connection
const postgres = require('postgres');
const config = require('../config');

const connectionString = config.database.url;
const sql = postgres(connectionString);

const connectDB = async () => {
  try {
    // Test connection with a simple query
    await sql`SELECT 1`;
    console.log('PostgreSQL Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  }
};

// Query helper - use sql template literals
// Example: await sql`SELECT * FROM users WHERE id = ${userId}`

module.exports = { sql, connectDB };
