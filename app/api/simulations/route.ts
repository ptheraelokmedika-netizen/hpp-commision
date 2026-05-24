import { NextResponse } from "next/server";
import { createSimulation, getAppData } from "../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../_utils";

export async function GET() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    return NextResponse.json({ ok: true, data: (await getAppData()).simulations });
  } catch (error) {
    return cleanError(error);
  }
}

export async function POST(request: Request) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const body = await request.json();
    if (!body?.id || !body?.itemName) return NextResponse.json({ ok: false, message: "Simulasi tidak valid." }, { status: 400 });
    await createSimulation(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
