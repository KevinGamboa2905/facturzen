-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "declineReason" TEXT,
ADD COLUMN     "signatureMeta" JSONB;
