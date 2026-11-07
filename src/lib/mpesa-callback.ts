import { z } from "zod";
export const mpesaCallbackSchema = z.object({ Body: z.object({ stkCallback: z.object({ MerchantRequestID: z.string().min(1).max(100), CheckoutRequestID: z.string().min(1).max(100), ResultCode: z.number().int(), ResultDesc: z.string().max(1000) }) }) });
export function isVerifiedCheckout(expected: { checkout: string; merchant: string }, result: { CheckoutRequestID: string; MerchantRequestID: string; ResultCode: string }) {
  return expected.checkout === result.CheckoutRequestID && expected.merchant === result.MerchantRequestID && result.ResultCode === "0";
}