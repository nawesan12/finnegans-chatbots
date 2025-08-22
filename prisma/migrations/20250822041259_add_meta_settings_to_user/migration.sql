-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaAppSecret" TEXT,
ADD COLUMN     "metaPhoneNumberId" TEXT,
ADD COLUMN     "metaVerifyToken" TEXT;
