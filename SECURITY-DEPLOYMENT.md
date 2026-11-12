# Production deployment decision required

The current UI calls Gemini directly in the browser. The Vite configuration
replaces `process.env.API_KEY` with `GEMINI_API_KEY` during bundling. A build
made with a provider key therefore exposes that key to anyone who can download
the JavaScript. A safe dummy-key build confirmed this mechanism; no real key
or deployed bundle was inspected.

This patch fails closed when a production build is given `GEMINI_API_KEY`.
It is a temporary build guard, not a completed production architecture. Keep
this PR unmerged until the deployment decision and compatibility work are ready.
Keyless builds can compile but cannot perform image generation with the current
client. Local development retains its existing direct API behavior and should
remain bound to localhost. Never expose that development server to other users.

## Required migration

1. Determine whether any existing public deployment was built with a real key.
   Review its build configuration privately; do not paste keys into issues,
   logs, screenshots, or chat. GitHub Pages was not enabled during review, but
   external hosting and the README's AI Studio demo require separate checking.
2. For shared hosting, move Gemini requests to a server-side endpoint. Keep the
   key server-side and add user authentication, request validation, rate limits,
   quota controls, and request size limits. Do not create an unauthenticated
   proxy. A deliberately per-user key design is another product decision, not
   a way to hide a shared developer key in frontend code.
3. If a real key was included in a public bundle, stop serving the affected
   build and revoke/rotate that key through the provider. Review usage, billing,
   API restrictions, and quotas. Merely removing the current JavaScript does
   not remove cached copies or make an exposed key safe again.
4. Build without a provider key in frontend environment variables. Verify the
   browser bundle and requests contain no server secret, then test authorized,
   unauthorized, oversized, and rate-limited requests against the new backend.

## Guard verification

Run `npm ci --ignore-scripts`, then
`GEMINI_API_KEY=SECURITY_AUDIT_DUMMY_NOT_A_REAL_KEY npm run build`.
The command must fail with the build-guard message and must not produce a new
bundle. Delete any older local `dist` output before this check so a stale bundle
cannot be mistaken for current output. Never run this test with a real key.

## Recovery

If this guard interrupts a deployment, keep the last confirmed safe service or
disable the frontend while implementing the migration. Do not restore key
injection or publish a key-bearing build as a workaround. No data migration is
part of this guard. No credentials or cloud services were created or changed.
