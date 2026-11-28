-- Invalidate already-issued access tokens on sensitive staff changes. Additive.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
