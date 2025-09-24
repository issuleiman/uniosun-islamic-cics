const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'uniosun_project',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'sulex.net',
  ssl: process.env.DB_SSL === 'true'
};

// Create connection pool
let pool;

// Initialize database connection
const initializeDatabase = async () => {
  try {
    pool = new Pool(config);
    
    // Test the connection
    const client = await pool.connect();
    client.release();
    
    return pool;
  } catch (error) {
    console.error('[ERROR] PostgreSQL connection error:', error.message);
    
    // For development/testing, create a mock pool
    if (process.env.NODE_ENV === 'development') {
      console.log('[WARN] Running in development mode without database connection');
      console.log('[INFO] To use full features, install PostgreSQL and run database/setup.sql');
      
      // Create a mock pool that returns empty results
      pool = {
        query: async () => ({ rows: [] }),
        connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
        end: async () => {}
      };
      
      return pool;
    }
    
    throw new Error('Failed to connect to database. Please check your configuration.');
  }
};

// Get database pool
const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

// Execute a query
const query = async (text, params) => {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Query executed successfully
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Execute a transaction
const transaction = async (callback) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Close database connection
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('[INFO] Database connection closed');
  }
};

module.exports = {
  initializeDatabase,
  getPool,
  query,
  transaction,
  closeDatabase
};