import { NextResponse } from "next/server";
import { deleteCommissionLog, upsertCommissionLog } from "../../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../../_utils";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body?.itemName) return NextResponse.json({ ok: false, message: "Log komisi tidak valid." }, { status: 400 });
    await upsertCommissionLog({ ...body, id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const { id } = await context.params;
    await deleteCommissionLog(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
