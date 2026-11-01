-- CreateTable
CREATE TABLE "account_session" (
    "token_hash" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "claims" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "account_session_pkey" PRIMARY KEY ("token_hash")
);

-- CreateIndex
CREATE INDEX "account_session_session_id_idx" ON "account_session"("session_id");

-- CreateIndex
CREATE INDEX "account_session_subject_idx" ON "account_session"("subject");

-- CreateIndex
CREATE INDEX "account_session_expires_at_idx" ON "account_session"("expires_at");
