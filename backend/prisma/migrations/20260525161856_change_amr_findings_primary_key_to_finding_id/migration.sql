/*
  Warnings:

  - The primary key for the `amr_findings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `amr_id` on the `amr_findings` table. All the data in the column will be lost.
  - Added the required column `finding_id` to the `amr_findings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Migrate amr_id to finding_id as primary key
ALTER TABLE "amr_findings" 
ADD COLUMN "finding_id" INTEGER;

-- Copy existing amr_id values to finding_id
UPDATE "amr_findings" SET "finding_id" = "amr_id" WHERE "finding_id" IS NULL;

-- Now drop the old primary key and amr_id column, set finding_id as new primary key
ALTER TABLE "amr_findings" 
DROP CONSTRAINT "amr_findings_pkey",
DROP COLUMN "amr_id",
ALTER COLUMN "finding_id" SET NOT NULL,
ADD CONSTRAINT "amr_findings_pkey" PRIMARY KEY ("finding_id");
