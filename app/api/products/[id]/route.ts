import { NextResponse } from "next/server";
import { deleteProduct, upsertProduct } from "../../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../../_utils";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body?.name) return NextResponse.json({ ok: false, message: "Produk harus memiliki nama." }, { status: 400 });
    await upsertProduct({ ...body, id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const { id } = await context.params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
