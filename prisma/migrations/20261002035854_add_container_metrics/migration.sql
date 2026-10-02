-- CreateTable
CREATE TABLE "ContainerMetric" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "cpuPercent" DOUBLE PRECISION NOT NULL,
    "memoryUsage" BIGINT NOT NULL DEFAULT 0,
    "memoryLimit" BIGINT NOT NULL DEFAULT 0,
    "memoryPercent" DOUBLE PRECISION NOT NULL,
    "rxBytes" BIGINT NOT NULL DEFAULT 0,
    "txBytes" BIGINT NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainerMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContainerMetric_containerId_recordedAt_idx" ON "ContainerMetric"("containerId", "recordedAt");

-- CreateIndex
CREATE INDEX "ContainerMetric_recordedAt_idx" ON "ContainerMetric"("recordedAt");
