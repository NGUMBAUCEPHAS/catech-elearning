# Account setup

## Commercial redesign and system update
- [x] Redesign authentication and role-specific dashboard shell with accessible sidebar/drawer.
- [x] Reuse learning, grading, company and admin tools; show real scoped statistics and tables.
- [x] Enforce tenant isolation and paid-content access; support managed staff and membership approval.
- [x] Provision the requested administrator account through trusted operations; email confirmation remains required.
- [x] Add provider-requeried M-Pesa callback processing, atomic settlement and student certificate access.
- [x] Verify test administrator login, company/student enrollment and learning, isolation, desktop/mobile views, and UI curriculum creation/edit/readback; 38 tests pass.
- [ ] Verify complete real registration, confirmation email and owner login — requires the owner's inbox confirmation.
- [ ] Verify live M-Pesa and paid learning — requires Daraja credentials and a published callback URL.

## Fresh Lovable Cloud connection
- [x] Use Cloud only; old records and accounts explicitly excluded by the user.
- [x] Repair public company discovery and verified-account onboarding.
- [x] Enforce trusted administrator checks and correct payment persistence.
- [x] Verify Cloud reads/writes: student and company sign-in, membership, profile update/readback; 31 tests pass.
- [ ] Verify live M-Pesa collection — blocked by missing Daraja credentials and callback configuration.
- [ ] Verify real signup confirmation email — requires inbox verification by the user.
- [x] Grant the owner's super administrator role; account created without bypassing email confirmation.

- [x] Enable account sign-in methods and create secure profiles and role storage.
- [x] Add sign-in, password recovery, and private profile dashboard.
- [x] Verify account creation, profile persistence, and sign-out with temporary accounts; verify owner isolation and denied role/institution edits.

Email delivery and external social sign-in round trips were not exercised; their methods are enabled.

# System-first branding

- [x] Install the supplied CATECH logo and matching favicon.
- [x] Remove marketing, sample dashboards, and certificate verification; open the real account system from home.
- [x] Verify navigation and account access after removing sample pages.

# Complete system brief

- [x] Finish institution foundation: trusted Super Admin setup, institution management, memberships, and tenant-isolation checks.
- [x] Add real course management, teacher/student assignments, enrollment, materials, and learning progress.
- [x] Add assessments, submissions, grading, and released results.
- [x] Add subscription management and provider-verified payment implementation; live billing remains blocked by provider setup.
- [x] Add attendance, live-class scheduling, announcements, and messaging.
- [x] Complete reporting and tenant/paid-access checks; production payment and email verification remain pending above.

Retain the user's explicit exclusions: no demos, marketing homepage, or certificate verification.

# Phase 7 — Role-Based Access Control (RBAC)

- [x] Create comprehensive RBAC database migration (`0004_comprehensive_rbac.sql`) with 12 standard roles, granular permissions, role-permission mappings, custom roles, permission overrides, and audit logging.
- [x] Build RBAC server functions (`rbac.functions.ts`) — role listing, assignment, revocation, permission overrides, audit log access, and effective-permission resolution via database RPC.
- [x] Build RBAC Management Panel UI (`RbacManagementPanel.tsx`) — roles tab, permissions accordion, permission override dialogs, and RBAC audit trail display.
- [x] Integrate RBAC panel into Super Admin Console with role and permission management card.
- [x] Enhance `getAccount` server function to fetch RBAC assigned roles and effective permissions alongside existing profile data.
- [x] Create `PermissionGate` component and `usePermissionCheck` helper for client-side UI permission guards.
- [x] Apply the source RBAC schema and functions to Lovable Cloud.
- [x] Keep privileged platform actions server-gated and RBAC operations caller-authenticated.
- [ ] End-to-end testing of RBAC enforcement across all 12 roles — requires appropriately provisioned real accounts.
