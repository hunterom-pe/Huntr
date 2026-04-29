/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

// Note: Run this with node --env-file=.env scripts/reset-db.js
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL not found in environment.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting full database reset (preserving users)...");

  try {
    // Delete all data but preserve Users and their Sessions
    // Order matters due to foreign key constraints
    await prisma.application.deleteMany({});
    console.log("✓ Applications cleared");
    
    await prisma.job.deleteMany({});
    console.log("✓ Jobs cleared");
    
    await prisma.profile.deleteMany({});
    console.log("✓ Profiles cleared (forcing onboarding)");

    console.log("\nDatabase reset complete. User accounts preserved.");
    console.log("You can now start fresh with onboarding.");
  } catch (error) {
    console.error("Reset failed:", error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
