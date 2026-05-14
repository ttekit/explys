# Studying plan JSON v2 cutover

Stored plans in `additional_user_data.studying_plan_phases` must be **version 2**:

- Top-level: `{ "version": 2, "phases": [...], "weeklyHabits": [...] }`
- Each phase includes a non-empty **`tasks`** array (typed objects with `kind`: `distinct_videos_passed`, `streak_days`, `vocabulary_terms_added`, `watch_time_minutes`, `min_phase_calendar_days`).

**Existing rows** with v1 / plain arrays are **invalid** for current app code paths that parse strictly on write. Mitigation:

1. **Per user:** call authenticated `POST /auth/profile/regenerate-studying-plan` (or use the in-app “Regenerate studying plan” control).
2. **Bulk:** run a script that loads each `additional_user_data` row, calls the same regeneration service (or SQL that clears `studying_plan_phases` and prompts users to regenerate).

**Database:** `active_phase_entered_at` on `additional_user_data` is optional metadata for future **phase-scoped** task evaluation; it is not written by this milestone. Apply migrations with `npx prisma migrate deploy` (or your usual process).
