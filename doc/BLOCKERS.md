# BLOCKERS

No open blockers.

Resolved 2026-03-14:
- The public application URL is now `https://ai-regulatory-intelligence.vercel.app`, so the previous Supabase scheduler URL blocker is cleared.
- The live Vercel app has been redeployed successfully, so the logout redirect fix is now published.

Deferred follow-ups:
- Activate hosted Supabase cron for `/api/internal/jobs/process` using the new public base URL.
- Repair Supabase migration history drift for `20260314205000_phase2_sanctions_screening`.
