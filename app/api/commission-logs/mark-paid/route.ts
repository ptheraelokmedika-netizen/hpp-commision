import { NextResponse } from "next/server";
import { markCommissionLogsPaid } from "../../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../../_utils";

export async function POST(request: Request) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const body = await request.json();
    if (!Array.isArray(body?.ids)) return NextResponse.json({ ok: false, message: "Pilih log komisi terlebih dahulu." }, { status: 400 });
    await markCommissionLogsPaid(body.ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
