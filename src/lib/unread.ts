import "server-only";
import { db } from "./db";

export async function unreadCounts(userId: string) {
  const [messages, notifications] = await Promise.all([
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = ${userId}::uuid
      WHERE m.sender_id IS DISTINCT FROM ${userId}::uuid
        AND m.hidden_at IS NULL
        AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)`,
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { messages: Number(messages[0]?.n ?? 0), notifications };
}
