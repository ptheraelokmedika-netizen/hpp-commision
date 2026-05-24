import { NextResponse } from "next/server";
import { seedDatabase } from "../../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../../_utils";

export async function POST() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    await seedDatabase();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
