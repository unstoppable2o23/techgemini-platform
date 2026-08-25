-- CreateEnum
CREATE TYPE "ProfileLevel" AS ENUM ('EMPTY', 'PARTIAL', 'DEVELOPING', 'COMPLETE');

-- AlterTable
ALTER TABLE "TestAssignment" ADD COLUMN     "assessmentVersion" TEXT NOT NULL DEFAULT '1.0',
ADD COLUMN     "profileProcessedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StudentCareerProfile" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "profileVersion" TEXT NOT NULL DEFAULT '1.0',
    "completeness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "level" "ProfileLevel" NOT NULL DEFAULT 'EMPTY',
    "primaryInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCareerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCareerSignal" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dimension" "TraitDimension" NOT NULL,
    "value" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "sourceAssessment" TEXT NOT NULL,
    "sourceAssignmentId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "StudentCareerSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentCareerProfile_studentId_key" ON "StudentCareerProfile"("studentId");

-- CreateIndex
CREATE INDEX "StudentCareerProfile_studentId_idx" ON "StudentCareerProfile"("studentId");

-- CreateIndex
CREATE INDEX "StudentCareerSignal_dimension_value_idx" ON "StudentCareerSignal"("dimension", "value");

-- CreateIndex
CREATE INDEX "StudentCareerSignal_profileId_idx" ON "StudentCareerSignal"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCareerSignal_profileId_dimension_value_sourceAssessm_key" ON "StudentCareerSignal"("profileId", "dimension", "value", "sourceAssessment");

-- AddForeignKey
ALTER TABLE "StudentCareerProfile" ADD CONSTRAINT "StudentCareerProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCareerSignal" ADD CONSTRAINT "StudentCareerSignal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentCareerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

