-- CreateTable
CREATE TABLE "metagenomic" (
    "id" SERIAL NOT NULL,
    "sampleID" INTEGER NOT NULL,
    "sequence_name" VARCHAR(255),
    "element_type" VARCHAR(255),
    "class" VARCHAR(255),
    "subclass" VARCHAR(255),

    CONSTRAINT "metagenomic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wgs" (
    "id" SERIAL NOT NULL,
    "sampleID" INTEGER NOT NULL,
    "isolateID" INTEGER NOT NULL,
    "organism" VARCHAR(255),

    CONSTRAINT "wgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amrResistanceGenes" (
    "id" SERIAL NOT NULL,
    "sampleID" INTEGER NOT NULL,
    "geneSymbol" VARCHAR(255),

    CONSTRAINT "amrResistanceGenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virulenceGenes" (
    "id" SERIAL NOT NULL,
    "isolateID" INTEGER NOT NULL,
    "geneSymbol" VARCHAR(255),

    CONSTRAINT "virulenceGenes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "metagenomic" ADD CONSTRAINT "metagenomic_sampleID_fkey" FOREIGN KEY ("sampleID") REFERENCES "measurements"("sampleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wgs" ADD CONSTRAINT "wgs_sampleID_fkey" FOREIGN KEY ("sampleID") REFERENCES "measurements"("sampleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amrResistanceGenes" ADD CONSTRAINT "amrResistanceGenes_sampleID_fkey" FOREIGN KEY ("sampleID") REFERENCES "measurements"("sampleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virulenceGenes" ADD CONSTRAINT "virulenceGenes_isolateID_fkey" FOREIGN KEY ("isolateID") REFERENCES "wgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
