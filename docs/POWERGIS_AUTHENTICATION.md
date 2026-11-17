# PowerGIS Authentication — V3.2

Authentication uses Supabase Auth email/password sign-in. Browser/local user-password authentication has been removed from the production path.

## Session lifecycle
- `supabase.auth.getSession()` restores the current session.
- `onAuthStateChange()` handles login, logout, refresh and password-recovery events.
- The application loads the corresponding active `user_profiles` row by `auth_user_id`.
- Missing/inactive profiles fail closed.
- Logout calls Supabase Auth sign-out.

## Password recovery
`resetPasswordForEmail()` is used for recovery. The recovery session displays a password-update flow using `updateUser({ password })`.

## Administration
User provisioning is performed by the `admin-provision-user` Edge Function using the server-side service-role secret. The service-role key is never shipped to the browser.

## Development demo
Persona switching is restricted to development builds. It is not an authentication mechanism and must not be enabled in production.
