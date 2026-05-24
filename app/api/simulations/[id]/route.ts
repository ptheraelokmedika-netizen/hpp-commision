import { deleteSimulation } from "../../../../src/db/queries";
import { cleanError, ensureDatabase, noDatabaseResponse } from "../../_utils";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!ensureDatabase()) return noDatabaseResponse();
  try {
    const { id } = await context.params;
    await deleteSimulation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cleanError(error);
  }
}
