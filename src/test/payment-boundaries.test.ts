import { describe, it, expect } from "vitest";
import { isVerifiedCheckout, mpesaCallbackSchema } from "../lib/mpesa-callback";
describe("M-Pesa confirmation boundary", () => {
  it("requires matching checkout and merchant IDs from provider confirmation", () => { expect(isVerifiedCheckout({checkout:"A",merchant:"M"},{CheckoutRequestID:"B",MerchantRequestID:"M",ResultCode:"0"})).toBe(false); expect(isVerifiedCheckout({checkout:"A",merchant:"M"},{CheckoutRequestID:"A",MerchantRequestID:"X",ResultCode:"0"})).toBe(false); });
  it("does not unlock a failed or pending transaction", () => { expect(isVerifiedCheckout({checkout:"A",merchant:"M"},{CheckoutRequestID:"A",MerchantRequestID:"M",ResultCode:"1032"})).toBe(false); expect(isVerifiedCheckout({checkout:"A",merchant:"M"},{CheckoutRequestID:"A",MerchantRequestID:"M",ResultCode:"0"})).toBe(true); });
  it("rejects callback bodies without a checkout reference", () => { expect(mpesaCallbackSchema.safeParse({Body:{stkCallback:{ResultCode:0}}}).success).toBe(false); });
});