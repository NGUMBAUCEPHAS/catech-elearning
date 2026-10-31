<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Accounts use a single root AccountProvider subscription and the client-only protected `_authenticated` layout so session transitions stay consistent.
- Private reads/updates go through authenticated server functions with owner-scoped RLS; roles and institution assignments are never user-editable.
- New accounts get the student role from a database trigger; elevated roles require trusted provisioning (RBAC functions), never signup metadata.
- M-Pesa (Daraja) payments run server-side in `src/lib/mpesa.server.ts`; credentials come from server secrets only.
