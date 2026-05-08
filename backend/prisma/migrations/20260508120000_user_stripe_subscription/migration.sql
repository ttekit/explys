-- Stripe billing fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_plan" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" TEXT;
