import "server-only";
import { db } from "./db";

export async function notify(userId: string, type: string, title: string, link?: string, body?: string) {
  await db.notification.create({ data: { userId, type, title, link, body } });
}

export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string, data?: object) {
  await db.auditLog.create({ data: { actorId, action, entityType, entityId, data } });
}
