import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { unreadCounts } from "@/lib/unread";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ messages: 0, notifications: 0 }, { status: 401 });
  return NextResponse.json(await unreadCounts(user.id), { headers: { "cache-control": "no-store" } });
}
