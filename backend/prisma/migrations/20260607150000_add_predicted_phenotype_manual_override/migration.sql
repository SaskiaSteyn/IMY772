ALTER TABLE "predicted_phenotypes"
ADD COLUMN "ai_resistant" BOOLEAN,
ADD COLUMN "is_manual_override" BOOLEAN NOT NULL DEFAULT false;

UPDATE "predicted_phenotypes"
SET "ai_resistant" = "resistant"
WHERE "ai_resistant" IS NULL;