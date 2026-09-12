-- Idempotent column additions for databases initialised before a schema change.
-- Applied by /api/setup "Apply schema updates" after the base DDL; each statement must be safe to re-run.
ALTER TABLE "MeritOpen" ADD COLUMN IF NOT EXISTS "registrationTarget" INTEGER;
UPDATE "MeritOpen" SET "registrationTarget" = "reservationTarget" WHERE "registrationTarget" IS NULL AND "reservationTarget" IS NOT NULL;
