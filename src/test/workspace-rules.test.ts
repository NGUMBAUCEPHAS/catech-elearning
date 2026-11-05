import { describe, it, expect } from "vitest";
import { resolveWorkspaceRole, workspaceViews } from "../lib/workspace";
describe("role-specific workspaces", () => {
  it("gives a platform admin only the platform workspace", () => { expect(resolveWorkspaceRole({ isPlatformAdmin: true, roles: ["student"], memberships: [] })).toBe("super_admin"); expect(workspaceViews.super_admin.some(v => v.id === "my_learning")).toBe(false); });
  it("uses active company administration rather than a student fallback", () => { expect(resolveWorkspaceRole({ isPlatformAdmin: false, roles: ["student"], memberships: [{ role: "institution_admin", active: true }] })).toBe("institution_admin"); });
  it("gives teachers an assigned-session workspace", () => { expect(resolveWorkspaceRole({ isPlatformAdmin: false, roles: ["student"], memberships: [{ role: "teacher" }] })).toBe("teacher"); });
  it("does not give students company or platform controls", () => { expect(resolveWorkspaceRole({ isPlatformAdmin: false, roles: ["student"], memberships: [{ role: "institution_admin", active: false }] })).toBe("student"); expect(workspaceViews.student.some(v => ["users", "staff", "rbac_management"].includes(v.id))).toBe(false); });
});