import { describe, it, expect, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: (input: unknown) => unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

describe("Fresh Cloud account rules", () => {
  it("does not elevate a student based on an email claim", async () => {
    const { getAccount } = await import("@/lib/account.functions");
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = vi.fn((table: string) => {
      const result = { data: table === "profiles" ? { id: "student", display_name: "Student" } : table === "user_roles" ? [{ role: "student" }] : [], error: null };
      const query = { select: () => query, eq: () => query, single: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
      return query;
    });
    const invoke = getAccount as unknown as (input: unknown) => Promise<{ roles: string[]; isPlatformAdmin: boolean }>;
    const account = await invoke({ context: { userId: "student", claims: { email: "ngumbaucephas2@gmail.com" }, supabase: { from, rpc } } });
    expect(account.roles).toEqual(["student"]);
    expect(account.isPlatformAdmin).toBe(false);
    expect(rpc).toHaveBeenCalledWith("complete_account_onboarding");
  });

  it("denies platform administration to a student before any private read", async () => {
    const { getPlatformGlobalStats } = await import("@/lib/superadmin.functions");
    const from = vi.fn();
    const invoke = getPlatformGlobalStats as unknown as (input: unknown) => Promise<unknown>;
    await expect(invoke({ context: { userId: "student", supabase: { from, rpc: vi.fn().mockResolvedValue({ data: false, error: null }) } } })).rejects.toThrow("Platform administrator access required");
    expect(from).not.toHaveBeenCalled();
  });
});