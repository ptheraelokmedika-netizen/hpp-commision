import { NextResponse } from "next/server";
import { getAppData, upsertProduct } from "../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../_utils";

export async function GET() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    return NextResponse.json({ ok: true, data: (await getAppData()).products });
  } catch (error) {
    return cleanError(error);
  }
}

export async function POST(request: Request) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const body = await request.json();
    if (!body?.id || !body?.name) return NextResponse.json({ ok: false, message: "Produk harus memiliki nama." }, { status: 400 });
    await upsertProduct(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
