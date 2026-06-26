import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { searchRecords } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const results = await searchRecords(createAnonClient(), q);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
