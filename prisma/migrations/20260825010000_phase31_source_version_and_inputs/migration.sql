-- AlterTable
ALTER TABLE "StudentCareerProfile" ADD COLUMN     "assessmentCompleteness" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StudentCareerSignal" ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'ASSESSMENT',
ADD COLUMN     "sourceVersion" TEXT NOT NULL DEFAULT '1.0';

-- DropUniqueConstraint (old constraint included sourceAssessment which is now nullable)
DROP INDEX IF EXISTS "StudentCareerSignal_profileId_dimension_value_sourceAssessment_key";

-- CreateIndex
CREATE UNIQUE INDEX "StudentCareerSignal_profileId_dimension_value_sourceType_key" ON "StudentCareerSignal"("profileId", "dimension", "value", "sourceType");
