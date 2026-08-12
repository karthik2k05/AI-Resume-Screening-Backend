const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: process.env.NODE_ENV === "production"
  ? { rejectUnauthorized: false }
  : false,
});

pool.connect()
  .then((client) => {
    console.log("✅ PostgreSQL Connected Successfully");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed");
    console.error(err);
  });

module.exports = pool;