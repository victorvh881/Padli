import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Download van al je eigen gegevens als JSON (AVG art. 20). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const data = await db.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      birthDate: true,
      createdAt: true,
      termsVersion: true,
      termsAcceptedAt: true,
      profile: true,
      availability: { select: { weekday: true, daypart: true } },
      matchRequests: true,
      participations: true,
      messages: { select: { conversationId: true, body: true, createdAt: true } },
      blocksMade: { select: { blockedId: true, createdAt: true } },
      reportsMade: { select: { targetType: true, reason: true, details: true, createdAt: true } },
      notifications: true,
    },
  });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="mijn-padoo-gegevens.json"' },
  });
}
