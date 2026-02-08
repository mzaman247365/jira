import "dotenv/config";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Dropping all tables and types...");

    // Drop all tables
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    for (const row of tablesResult.rows) {
      await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
      console.log(`  Dropped table: ${row.tablename}`);
    }

    // Drop all custom types/enums
    const typesResult = await client.query(`
      SELECT typname FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `);
    for (const row of typesResult.rows) {
      await client.query(`DROP TYPE IF EXISTS "${row.typname}" CASCADE`);
      console.log(`  Dropped type: ${row.typname}`);
    }

    console.log("\nAll tables and types dropped.");
    console.log("Now applying migration...\n");

    // Read and execute the migration file
    const fs = await import("fs");
    const migrationSQL = fs.readFileSync("./migrations/0000_flat_unus.sql", "utf-8");

    // Split by statement breakpoint and execute each
    const statements = migrationSQL.split("--> statement-breakpoint");
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        await client.query(trimmed);
      }
    }

    // Mark migration as applied in drizzle's tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    await client.query(`
      INSERT INTO "__drizzle_migrations" (hash, created_at)
      VALUES ('0000_flat_unus', ${Date.now()})
      ON CONFLICT DO NOTHING
    `);

    console.log("Migration applied successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
