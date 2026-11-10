-- AlterTable
ALTER TABLE "quack" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "reply" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mood" "quack_mood",
    "quackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reply_quackId_createdAt_idx" ON "reply"("quackId", "createdAt");

-- CreateIndex
CREATE INDEX "reply_userId_idx" ON "reply"("userId");

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_quackId_fkey" FOREIGN KEY ("quackId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A quack is either alive (author set, not deleted) or a tombstone: no author,
-- empty text, no mood. Prisma cannot express a check constraint, so it is added by hand.
ALTER TABLE "quack" ADD CONSTRAINT "quack_tombstone_is_empty" CHECK (
  ("deletedAt" IS NULL AND "userId" IS NOT NULL)
  OR ("deletedAt" IS NOT NULL AND "userId" IS NULL AND "text" = '' AND "mood" IS NULL)
);
