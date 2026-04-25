-- Make additional_user_data removed automatically with user deletion
ALTER TABLE "additional_user_data"
DROP CONSTRAINT "additional_user_data_userId_fkey";

ALTER TABLE "additional_user_data"
ADD CONSTRAINT "additional_user_data_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
