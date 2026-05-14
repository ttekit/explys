-- Studying plan v2: optional anchor for phase-scoped completion tasks
ALTER TABLE "additional_user_data"
ADD COLUMN IF NOT EXISTS "active_phase_entered_at" TIMESTAMP(3);
