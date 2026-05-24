import { NextResponse } from "next/server";
import { getAppData, replaceAppData } from "../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../_utils";

export async function GET() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    return NextResponse.json({ ok: true, data: await getAppData() });
  } catch (error) {
    return cleanError(error);
  }
}

export async function PUT(request: Request) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const body = await request.json();
    if (!body?.fixedCosts || !Array.isArray(body?.treatments) || !Array.isArray(body?.products)) {
      return NextResponse.json({ ok: false, message: "Payload data tidak valid." }, { status: 400 });
    }
    await replaceAppData(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
