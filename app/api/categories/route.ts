import { NextResponse } from "next/server";
import { getAppData, replaceAppData } from "../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../_utils";

export async function GET() {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    return NextResponse.json({ ok: true, data: (await getAppData()).categories });
  } catch (error) {
    return cleanError(error);
  }
}

export async function POST(request: Request) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const body = await request.json();
    if (!body?.id || !body?.group || !body?.name) {
      return NextResponse.json({ ok: false, message: "Kategori tidak valid." }, { status: 400 });
    }
    const data = await getAppData();
    await replaceAppData({ ...data, categories: [body, ...data.categories.filter((item) => item.id !== body.id)] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
