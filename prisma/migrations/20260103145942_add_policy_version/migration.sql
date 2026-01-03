-- CreateTable
CREATE TABLE "policy_version" (
    "id" TEXT NOT NULL,
    "type" "consent_type" NOT NULL,
    "version" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "policy_version_type_is_active_idx" ON "policy_version"("type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "policy_version_type_version_key" ON "policy_version"("type", "version");
