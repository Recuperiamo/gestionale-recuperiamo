-- CreateEnum
CREATE TYPE "PasswordResetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "password_reset_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "PasswordResetStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_requests_token_key" ON "password_reset_requests"("token");

-- CreateIndex
CREATE INDEX "password_reset_requests_userId_idx" ON "password_reset_requests"("userId");

-- CreateIndex
CREATE INDEX "password_reset_requests_status_idx" ON "password_reset_requests"("status");

-- CreateIndex
CREATE INDEX "password_reset_requests_token_idx" ON "password_reset_requests"("token");

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
