CREATE TABLE "adminDeleteAudits" (
    "id" SERIAL NOT NULL,
    "actorUserID" INTEGER NOT NULL,
    "actorEmail" VARCHAR(255),
    "entityType" VARCHAR(120) NOT NULL,
    "entityKey" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adminDeleteAudits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "adminDeleteAudits_actorUserID_idx" ON "adminDeleteAudits"("actorUserID");
CREATE INDEX "adminDeleteAudits_entityType_idx" ON "adminDeleteAudits"("entityType");
CREATE INDEX "adminDeleteAudits_created_at_idx" ON "adminDeleteAudits"("created_at");
