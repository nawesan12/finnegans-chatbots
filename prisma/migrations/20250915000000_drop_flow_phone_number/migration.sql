-- Drop the deprecated phoneNumber column from Flow since we now rely on a single WhatsApp number per account
ALTER TABLE "public"."Flow" DROP COLUMN IF EXISTS "phoneNumber";
