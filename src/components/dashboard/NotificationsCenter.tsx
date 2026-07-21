"use client";

// Notifications centre: the admin composes messages to staff groups or to all
// parents, sees the send history, and controls automatic fee reminders.
// Messages are stored in the school's log; SMS/WhatsApp/email delivery channels
// are connected in a later phase (clearly labelled).

import { useActionState, useEffect, useRef } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { sendNotice, deleteNotice, type ActionState } from "@/lib/actions/notifications";

export type NoticeRow = { id: string; audience: string; title: string | null; body: string; sentBy: string; when: string };

const AUDIENCE_META: Record<string, { label: string; tone: "forest" | "amber" | "blue" | "neutral" }> = {
  ALL_STAFF: { label: "All staff", tone: "forest" },
  TEACHERS: { label: "Teachers", tone: "neutral" },
  BURSARS: { label: "Bursars", tone: "amber" },
  PARENTS: { label: "All parents", tone: "blue" },
};

const input =
  "h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card placeholder:text-ink-4";

function Compose() {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendNotice, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);

  return (
    <Card>
      <div className="text-body font-semibold text-ink">Send a message</div>
      <div className="mt-0.5 text-[12.5px] text-ink-4">To your staff, or a group message to every parent.</div>
      <form ref={ref} action={action} className="mt-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Send to</span>
            <select name="audience" defaultValue="ALL_STAFF" className={input}>
              <option value="ALL_STAFF">All staff</option>
              <option value="TEACHERS">Teachers only</option>
              <option value="BURSARS">Bursars only</option>
              <option value="PARENTS">All parents (group message)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Subject (optional)</span>
            <input name="title" placeholder="e.g. Mid-term break notice" className={input} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Message *</span>
          <textarea name="body" required rows={4} placeholder="Type your message…" className="w-full rounded-[var(--radius-card)] border border-border bg-secondary p-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card placeholder:text-ink-4" />
        </label>
        {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
        {state.ok && <p className="text-[12.5px] font-medium text-green">Message recorded and queued. ✓</p>}
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] text-ink-4">Stored in your school&apos;s log now · SMS/WhatsApp/email delivery connects in a later phase.</span>
          <button disabled={pending} className="h-10 rounded-[var(--radius-card)] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export function NotificationsCenter({ notices }: { notices: NoticeRow[] }) {
  return (
    <div className="flex flex-col gap-5">
      <Compose />
      <Card pad={0} className="overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div className="text-body font-semibold text-ink">Sent messages</div>
          <Pill tone="neutral">{notices.length}</Pill>
        </div>
        {notices.length === 0 ? (
          <div className="px-5 pb-8 text-[13px] text-ink-4">Nothing sent yet.</div>
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {notices.map((n) => {
              const a = AUDIENCE_META[n.audience] ?? { label: n.audience, tone: "neutral" as const };
              return (
                <div key={n.id} className="flex items-start gap-3 px-5 py-3">
                  <Pill tone={a.tone}>{a.label}</Pill>
                  <div className="min-w-0 flex-1">
                    {n.title && <div className="text-[13px] font-semibold text-ink">{n.title}</div>}
                    <div className="text-[12.5px] text-ink-2">{n.body}</div>
                    <div className="mt-1 text-[11px] text-ink-4">{n.sentBy} · {n.when}</div>
                  </div>
                  <form action={deleteNotice}>
                    <input type="hidden" name="id" value={n.id} />
                    <button title="Delete" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                      <Icon name="trash" size={15} />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
