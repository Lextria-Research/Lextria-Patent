const { Pool } = require('pg');
require('dotenv').config();

const { types } = require('pg');
types.setTypeParser(1082, (value) => value); // return DATE columns as plain YYYY-MM-DD strings

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Quick check that the connection works when the server starts
pool.query('SELECT NOW()')
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('PostgreSQL connection failed:', err.message));

module.exports = pool;