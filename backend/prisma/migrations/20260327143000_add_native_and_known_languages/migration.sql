ALTER TABLE "additional_user_data"
ADD COLUMN "nativeLanguage" TEXT,
ADD COLUMN "knownLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
