-- AlterTable: make finding_id auto-increment
CREATE SEQUENCE IF NOT EXISTS "amr_findings_finding_id_seq";
ALTER TABLE "amr_findings" ALTER COLUMN "finding_id" SET DEFAULT nextval('"amr_findings_finding_id_seq"');
SELECT setval('"amr_findings_finding_id_seq"', COALESCE((SELECT MAX(finding_id) FROM "amr_findings"), 0) + 1, false);
ALTER SEQUENCE "amr_findings_finding_id_seq" OWNED BY "amr_findings"."finding_id";
