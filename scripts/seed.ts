import "dotenv/config";
import { seedDatabase } from "../src/db/queries";

async function main() {
  await seedDatabase();
  console.log("Hera Clinic sample data seeded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
