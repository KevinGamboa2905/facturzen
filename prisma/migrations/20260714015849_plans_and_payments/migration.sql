-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "sentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "billingCycleAnchor" TIMESTAMP(3),
ADD COLUMN     "planBannerSeenAt" TIMESTAMP(3),
ADD COLUMN     "planSelectedAt" TIMESTAMP(3),
ADD COLUMN     "showBankDetails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
