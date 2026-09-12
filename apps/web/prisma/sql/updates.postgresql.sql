-- Idempotent column additions for databases initialised before a schema change.
-- Applied by /api/setup "Apply schema updates" after the base DDL; each statement must be safe to re-run.
ALTER TABLE "MeritOpen" ADD COLUMN IF NOT EXISTS "registrationTarget" INTEGER;
UPDATE "MeritOpen" SET "registrationTarget" = "reservationTarget" WHERE "registrationTarget" IS NULL AND "reservationTarget" IS NOT NULL;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MeritOpen" ADD COLUMN IF NOT EXISTS "demo" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Property" SET "demo" = true WHERE "slug" IN ('practice-event', 'larkspur-residence', 'alder-ridge-house');
UPDATE "MeritOpen" SET "demo" = true WHERE "slug" IN ('practice-summer', 'practice-autumn', 'hollow-creek', 'cedar-hollow');
