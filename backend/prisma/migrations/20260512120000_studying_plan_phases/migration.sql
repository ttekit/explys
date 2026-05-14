-- Studying plan: persisted phases (JSON) and active phase index
ALTER TABLE "additional_user_data" ADD COLUMN IF NOT EXISTS "studying_plan_phases" JSONB;
ALTER TABLE "additional_user_data" ADD COLUMN IF NOT EXISTS "active_studying_phase_index" INTEGER NOT NULL DEFAULT 0;
