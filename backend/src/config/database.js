const mysql  = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;

async function connectDB() {
  pool = mysql.createPool({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASS,
    database:           process.env.DB_NAME,
    port:               process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit:    20,
    queueLimit:         0,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 0,
  });

  // Verify connection
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  return pool;
}

async function query(sql, params = []) {
  const start = Date.now();
  try {
    const [rows] = await pool.execute(sql, params);
    const dur = Date.now() - start;
    if (dur > 500) logger.warn(`Slow query (${dur}ms): ${sql.substring(0, 80)}`);
    return rows;
  } catch (err) {
    logger.error(`DB error: ${err.message} | SQL: ${sql.substring(0, 80)}`);
    throw err;
  }
}

module.exports = { connectDB, query, get pool() { return pool; } };
