import { createFileRoute } from "@tanstack/react-router";
import { mpesaCallbackSchema, isVerifiedCheckout } from "@/lib/mpesa-callback";
export const Route = createFileRoute("/api/public/mpesa/callback")({ server: { handlers: { POST: async ({ request }) => {
  // Daraja STK callbacks have no HMAC signature. Treat their body as a hint only:
  // requery Safaricom before writing any payment or enrollment state.
  const body = await request.text();
  if (body.length > 16000) return new Response("Payload too large", { status: 413 });
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return new Response("Invalid callback", { status: 400 }); }
  const checked = mpesaCallbackSchema.safeParse(parsed);
  if (!checked.success) return new Response("Invalid callback", { status: 400 });
  const hint = checked.data.Body.stkCallback;
  if (!process.env["MPESA_PASSKEY"] || !process.env["MPESA_CONSUMER_KEY"] || !process.env["MPESA_CONSUMER_SECRET"]) return new Response("Payment service unavailable", { status: 503 });
  try {
    const { queryStkStatus } = await import("@/lib/mpesa.server");
    const verified = await queryStkStatus(hint.CheckoutRequestID);
    if (!isVerifiedCheckout({ checkout: hint.CheckoutRequestID, merchant: hint.MerchantRequestID }, verified)) return new Response("Payment not confirmed", { status: 202 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin.from("payments").select("id,merchant_request_id").eq("checkout_request_id", verified.CheckoutRequestID).maybeSingle();
    if (error || !payment || payment.merchant_request_id !== verified.MerchantRequestID) return new Response("Unknown transaction", { status: 400 });
    const { error: settlementError } = await supabaseAdmin.rpc("settle_verified_course_payment", { _payment: payment.id, _description: verified.ResultDesc });
    if (settlementError) throw new Error("Payment settlement failed");
    return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch { return new Response("Verification unavailable; retry later", { status: 503 }); }
} } } });