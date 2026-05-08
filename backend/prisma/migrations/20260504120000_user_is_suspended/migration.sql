-- Block sign-in / profile for suspended accounts (admin-controlled).
ALTER TABLE "users" ADD COLUMN "is_suspended" BOOLEAN NOT NULL DEFAULT false;
