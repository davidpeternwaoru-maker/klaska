import { paymentsService } from "@/server/services/payments";
import { captureError } from "@/lib/logger";

// Paystack webhook. Public, but authenticated by the HMAC signature (only
// Paystack, holding our secret key, can produce a valid one). We read the RAW
// body — the signature is computed over the exact bytes. Always 200 on a valid
// signature so Paystack doesn't retry a duplicate we've already handled.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  try {
    const result = await paymentsService.handleWebhook(raw, signature);
    if (!result.ok && result.reason === "bad_signature") {
      return new Response("invalid signature", { status: 401 });
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    // Log but 200 so Paystack retries later only on genuine transient failure.
    captureError(e, { scope: "paystack_webhook" });
    return new Response("error", { status: 500 });
  }
}
