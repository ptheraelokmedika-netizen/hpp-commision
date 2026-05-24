import { NextResponse } from "next/server";
import { getAppData, updateSettings } from "../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../_utils";

export async function GET() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    return NextResponse.json({ ok: true, data: (await getAppData()).fixedCosts });
  } catch (error) {
    return cleanError(error);
  }
}

export async function PUT(request: Request) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ ok: false, message: "Payload tidak valid." }, { status: 400 });
    await updateSettings(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
