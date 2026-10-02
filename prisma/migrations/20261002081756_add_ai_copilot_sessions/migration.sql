-- CreateTable
CREATE TABLE "AiCopilotSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "telemetryAvailable" BOOLEAN NOT NULL DEFAULT false,
    "containerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCopilotSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiCopilotSession_userId_createdAt_idx" ON "AiCopilotSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCopilotSession_projectId_createdAt_idx" ON "AiCopilotSession"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiCopilotSession" ADD CONSTRAINT "AiCopilotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCopilotSession" ADD CONSTRAINT "AiCopilotSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
