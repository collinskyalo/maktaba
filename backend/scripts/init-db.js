const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  try {
    const schema = fs.readFileSync(
      path.join(__dirname, "../../database/schema.sql"),
      "utf8"
    );

    await pool.query(schema);
    console.log("Database schema created successfully.");

    const seed = fs.readFileSync(
      path.join(__dirname, "../../database/seed.sql"),
      "utf8"
    );

    await pool.query(seed);
    console.log("Sample data imported successfully.");

    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

init();