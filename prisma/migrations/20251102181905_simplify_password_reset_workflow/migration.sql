/*
  Warnings:

  - The values [APPROVED,EXPIRED] on the enum `PasswordResetStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `token` on the `password_reset_requests` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiresAt` on the `password_reset_requests` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PasswordResetStatus_new" AS ENUM ('PENDING', 'REJECTED', 'COMPLETED');
ALTER TABLE "public"."password_reset_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "password_reset_requests" ALTER COLUMN "status" TYPE "PasswordResetStatus_new" USING ("status"::text::"PasswordResetStatus_new");
ALTER TYPE "PasswordResetStatus" RENAME TO "PasswordResetStatus_old";
ALTER TYPE "PasswordResetStatus_new" RENAME TO "PasswordResetStatus";
DROP TYPE "public"."PasswordResetStatus_old";
ALTER TABLE "password_reset_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropIndex
DROP INDEX "public"."password_reset_requests_token_idx";

-- DropIndex
DROP INDEX "public"."password_reset_requests_token_key";

-- AlterTable
ALTER TABLE "password_reset_requests" DROP COLUMN "token",
DROP COLUMN "tokenExpiresAt";
