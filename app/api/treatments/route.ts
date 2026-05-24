import { NextResponse } from "next/server";
import { getAppData, upsertTreatment } from "../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../_utils";

export async function GET() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    return NextResponse.json({ ok: true, data: (await getAppData()).treatments });
  } catch (error) {
    return cleanError(error);
  }
}

export async function POST(request: Request) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const body = await request.json();
    if (!body?.id || !body?.name) return NextResponse.json({ ok: false, message: "Treatment harus memiliki nama." }, { status: 400 });
    await upsertTreatment(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
