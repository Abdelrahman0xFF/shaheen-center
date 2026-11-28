-- A7: refresh-token rotation hardening. Additive; backfills existing sessions.
ALTER TABLE "RefreshToken" ADD COLUMN "replacedByTokenId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "rotatedAt" TIMESTAMP(3);
ALTER TABLE "RefreshToken" ADD COLUMN "familyExpiresAt" TIMESTAMP(3);

UPDATE "RefreshToken" SET "familyExpiresAt" = "expiresAt" WHERE "familyExpiresAt" IS NULL;

ALTER TABLE "RefreshToken" ALTER COLUMN "familyExpiresAt" SET NOT NULL;

CREATE INDEX "RefreshToken_familyId_revokedAt_idx" ON "RefreshToken"("familyId", "revokedAt");
CREATE INDEX "RefreshToken_replacedByTokenId_idx" ON "RefreshToken"("replacedByTokenId");
