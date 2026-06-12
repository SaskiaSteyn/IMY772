-- ─── samples: add sample_name and collected_by ──────────────────────────────
ALTER TABLE "samples" ADD COLUMN "sample_name" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "samples" ADD COLUMN "collected_by" VARCHAR(255);

-- ─── amr_findings: rename drug_class → amr_class, add new columns ────────────
ALTER TABLE "amr_findings" RENAME COLUMN "drug_class" TO "amr_class";

ALTER TABLE "amr_findings" ADD COLUMN "sequence_name" VARCHAR(255);
ALTER TABLE "amr_findings" ADD COLUMN "element_type" VARCHAR(255);
ALTER TABLE "amr_findings" ADD COLUMN "subclass" VARCHAR(255);
ALTER TABLE "amr_findings" ADD COLUMN "target_length" INTEGER;
ALTER TABLE "amr_findings" ADD COLUMN "reference_sequence_length" INTEGER;
ALTER TABLE "amr_findings" ADD COLUMN "percentage_coverage" DECIMAL(5, 2);
ALTER TABLE "amr_findings" ADD COLUMN "accession_of_closest_sequence" VARCHAR(255);
ALTER TABLE "amr_findings" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "amr_findings" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── predicted_phenotypes: replace resistant with predicted_sir_profile ───────
ALTER TABLE "predicted_phenotypes" ADD COLUMN "predicted_sir_profile" VARCHAR(50);

-- Migrate existing boolean resistant values → string
UPDATE "predicted_phenotypes"
SET "predicted_sir_profile" = CASE
    WHEN resistant = true  THEN 'Resistant'
    WHEN resistant = false THEN 'Susceptible'
    ELSE NULL
END;

ALTER TABLE "predicted_phenotypes" DROP COLUMN "resistant";

ALTER TABLE "predicted_phenotypes" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "predicted_phenotypes" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── Create virulence_genes table ────────────────────────────────────────────
CREATE TABLE "virulence_genes" (
    "virulence_gene_id" SERIAL NOT NULL,
    "sample_id"         VARCHAR(255) NOT NULL,
    "gene_symbol"       VARCHAR(255) NOT NULL,
    "method"            VARCHAR(255),
    "percent_identity"  DECIMAL(5, 2),
    "coverage_percent"  DECIMAL(5, 2),
    "alignment_length"  INTEGER,
    "target_length"     INTEGER,
    "ref_seq_length"    INTEGER,
    "accession"         VARCHAR(255),
    "sequence_name"     VARCHAR(255),
    "element_type"      VARCHAR(255),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virulence_genes_pkey" PRIMARY KEY ("virulence_gene_id")
);

CREATE INDEX "virulence_genes_sample_id_idx" ON "virulence_genes"("sample_id");

ALTER TABLE "virulence_genes" ADD CONSTRAINT "virulence_genes_sample_id_fkey"
    FOREIGN KEY ("sample_id") REFERENCES "samples"("sample_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
