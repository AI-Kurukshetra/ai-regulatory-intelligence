# BLOCKERS

[2026-03-14] BLOCKER — Codex
Problem:   The browser logout redirect bug is fixed in code, but this machine cannot currently publish the fix to the live Vercel app because local Vercel CLI auth is empty and no git credential helper is configured for a push-triggered deploy.
Attempted: Updated `app/api/auth/signout/route.ts` to return `303 /login`, verified the behavior locally with `curl`, and checked both Vercel CLI auth (`~/.local/share/com.vercel.cli/auth.json`) and git credentials.
Needs:     A valid Vercel login/token on this machine or a git push path that can trigger the existing Vercel deployment.

Resolved 2026-03-14:
- The public application URL is now `https://ai-regulatory-intelligence.vercel.app`, so the previous Supabase scheduler URL blocker is cleared.

Deferred follow-ups:
- Activate hosted Supabase cron for `/api/internal/jobs/process` using the new public base URL.
- Repair Supabase migration history drift for `20260314205000_phase2_sanctions_screening`.
