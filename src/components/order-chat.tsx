"use client";

import { useState, useTransition } from "react";
import type {
  ConversationParticipantRole,
  Message,
  User,
} from "@prisma/client";
import { sendMessage } from "@/app/actions/messages";
import { timeAgo } from "@/lib/utils";

type MessageWithSender = Message & {
  sender: Pick<User, "name" | "email" | "image" | "role"> | null;
};

const ROLE_BADGE: Record<ConversationParticipantRole, string> = {
  USER: "text-[color:var(--muted)]",
  PRO: "text-[color:var(--primary)]",
  ADMIN: "text-[color:var(--accent)]",
  SYSTEM: "text-[color:var(--muted)]",
};

export function OrderChat({
  orderId,
  messages,
  canPostInternal,
}: {
  orderId: string;
  messages: MessageWithSender[];
  canPostInternal?: boolean;
}) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {messages.length === 0 ? (
          <div className="rounded-md border border-[color:var(--border)] bg-[#0a0d15] px-4 py-6 text-center text-sm text-[color:var(--muted)]">
            No messages yet — send the first update.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                "rounded-md border px-3 py-2 " +
                (m.isInternal
                  ? "border-amber-400/30 bg-amber-400/5"
                  : "border-[color:var(--border)] bg-[#0a0d15]")
              }
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider">
                <span className={ROLE_BADGE[m.senderRole]}>
                  {m.sender?.name ?? m.sender?.email ?? m.senderRole}
                  {m.isInternal && " · INTERNAL"}
                </span>
                <span className="text-[color:var(--muted)]">
                  {timeAgo(m.createdAt)}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div>
            </div>
          ))
        )}
      </div>

      <form
        action={(fd) => {
          setError(null);
          if (!body.trim()) return;
          fd.set("orderId", orderId);
          fd.set("body", body);
          fd.set("isInternal", isInternal ? "1" : "0");
          start(async () => {
            try {
              await sendMessage(fd);
              setBody("");
              setIsInternal(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to send");
            }
          });
        }}
        className="space-y-2"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          rows={3}
          className="input-base w-full"
        />
        <div className="flex items-center justify-between gap-2">
          {canPostInternal ? (
            <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              Internal note (admins only)
            </label>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="btn-primary rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
