import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "../../src/db";

export function noDatabaseResponse() {
  return NextResponse.json(
    {
      ok: false,
      fallback: "localStorage",
      message: "Database belum terhubung, data tersimpan lokal di browser ini.",
    },
    { status: 503 },
  );
}

export function ensureDatabase() {
  return hasDatabaseUrl();
}

export function cleanError(error: unknown) {
  console.error(error);
  return NextResponse.json({ ok: false, message: "Terjadi kesalahan database. Coba lagi beberapa saat." }, { status: 500 });
}
