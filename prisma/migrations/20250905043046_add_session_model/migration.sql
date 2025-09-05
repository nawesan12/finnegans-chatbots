-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "currentNodeId" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_contactId_flowId_key" ON "public"."Session"("contactId", "flowId");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "public"."Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
