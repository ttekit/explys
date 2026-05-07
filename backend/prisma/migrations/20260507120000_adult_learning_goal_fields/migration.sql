-- Adult learner registration: motivation + time horizon
ALTER TABLE "additional_user_data" ADD COLUMN IF NOT EXISTS "learning_goal" TEXT;
ALTER TABLE "additional_user_data" ADD COLUMN IF NOT EXISTS "time_to_achieve" TEXT;
