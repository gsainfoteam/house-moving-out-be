-- CreateTable
CREATE TABLE "inspector" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,
    "available_times" TIMESTAMP(3)[],

    CONSTRAINT "inspector_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "inspector_email_key" ON "inspector"("email");
