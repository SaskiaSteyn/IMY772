/*
  Warnings:

  - The primary key for the `samples` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `collected_by` on the `samples` table. All the data in the column will be lost.
  - You are about to drop the column `predicted_sir_profile` on the `samples` table. All the data in the column will be lost.
  - You are about to drop the column `sampleID` on the `samples` table. All the data in the column will be lost.
  - You are about to drop the column `sample_analysis_type` on the `samples` table. All the data in the column will be lost.
  - You are about to drop the column `uploaded_by` on the `samples` table. All the data in the column will be lost.
  - You are about to drop the column `water_temperature` on the `samples` table. All the data in the column will be lost.
  - You are about to drop the `amrResistanceGenes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `metagenomic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `virulenceGenes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wgs` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `sample_id` to the `samples` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "amrResistanceGenes" DROP CONSTRAINT "amrResistanceGenes_sampleID_fkey";

-- DropForeignKey
ALTER TABLE "metagenomic" DROP CONSTRAINT "metagenomic_sampleID_fkey";

-- DropForeignKey
ALTER TABLE "virulenceGenes" DROP CONSTRAINT "virulenceGenes_sampleID_isolateID_fkey";

-- DropForeignKey
ALTER TABLE "wgs" DROP CONSTRAINT "wgs_sampleID_fkey";

-- AlterTable
ALTER TABLE "samples" DROP CONSTRAINT "samples_pkey",
DROP COLUMN "collected_by",
DROP COLUMN "predicted_sir_profile",
DROP COLUMN "sampleID",
DROP COLUMN "sample_analysis_type",
DROP COLUMN "uploaded_by",
DROP COLUMN "water_temperature",
ADD COLUMN     "sample_id" VARCHAR(255) NOT NULL,
ADD COLUMN     "water_temp" DECIMAL(5,2),
ADD CONSTRAINT "samples_pkey" PRIMARY KEY ("sample_id");

-- DropTable
DROP TABLE "amrResistanceGenes";

-- DropTable
DROP TABLE "metagenomic";

-- DropTable
DROP TABLE "virulenceGenes";

-- DropTable
DROP TABLE "wgs";

-- CreateTable
CREATE TABLE "isolates" (
    "isolate_id" SERIAL NOT NULL,
    "sample_id" VARCHAR(255) NOT NULL,
    "organism" VARCHAR(255),
    "mlst_type" VARCHAR(255),

    CONSTRAINT "isolates_pkey" PRIMARY KEY ("isolate_id")
);

-- CreateTable
CREATE TABLE "amr_findings" (
    "amr_id" SERIAL NOT NULL,
    "sample_id" VARCHAR(255) NOT NULL,
    "analysis_type" VARCHAR(255),
    "gene_symbol" VARCHAR(255),
    "drug_class" VARCHAR(255),
    "method" VARCHAR(255),
    "percent_identity" DECIMAL(5,2),

    CONSTRAINT "amr_findings_pkey" PRIMARY KEY ("amr_id")
);

-- CreateTable
CREATE TABLE "predicted_phenotypes" (
    "phenotype_id" SERIAL NOT NULL,
    "sample_id" VARCHAR(255) NOT NULL,
    "organism" VARCHAR(255),
    "antibiotic" VARCHAR(255),
    "resistant" BOOLEAN,

    CONSTRAINT "predicted_phenotypes_pkey" PRIMARY KEY ("phenotype_id")
);

-- CreateIndex
CREATE INDEX "isolates_sample_id_idx" ON "isolates"("sample_id");

-- CreateIndex
CREATE INDEX "amr_findings_sample_id_idx" ON "amr_findings"("sample_id");

-- CreateIndex
CREATE INDEX "predicted_phenotypes_sample_id_idx" ON "predicted_phenotypes"("sample_id");

-- AddForeignKey
ALTER TABLE "isolates" ADD CONSTRAINT "isolates_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("sample_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amr_findings" ADD CONSTRAINT "amr_findings_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("sample_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicted_phenotypes" ADD CONSTRAINT "predicted_phenotypes_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("sample_id") ON DELETE RESTRICT ON UPDATE CASCADE;
