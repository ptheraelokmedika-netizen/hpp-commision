import { NextResponse } from "next/server";
import { clearDatabase } from "../../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../../_utils";

export async function POST() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    await clearDatabase();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
