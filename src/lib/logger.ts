import "server-only";

// Structured logging + error capture. Logs one JSON object per line to stdout —
// the host-agnostic convention that any log aggregator (Datadog, Logtail, the
// platform's own log drain) can parse. `captureError` additionally forwards to
// an external monitor when MONITOR_WEBHOOK is configured, so production errors
// are visible without coupling the code to a specific vendor.

import { env } from "@/env";

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => {
    if (env.NODE_ENV !== "production") emit("debug", msg, fields);
  },
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};

/** Report an unexpected error for monitoring. Always structured-logs; forwards
 *  to MONITOR_WEBHOOK (best-effort, non-blocking) when configured. Never throws. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  const e = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { message: String(err) };
  log.error("unhandled_error", { err: e, ...context });
  if (env.MONITOR_WEBHOOK) {
    // Fire-and-forget; a monitoring outage must never affect the request.
    fetch(env.MONITOR_WEBHOOK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ err: e, context, time: new Date().toISOString() }) }).catch(() => {});
  }
}
