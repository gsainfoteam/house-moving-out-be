-- CreateTable
CREATE TABLE "inspector_available_slot" (
    "inspector_id" TEXT NOT NULL,
    "inspection_slot_id" TEXT NOT NULL,

    CONSTRAINT "inspector_available_slot_pkey" PRIMARY KEY ("inspector_id","inspection_slot_id")
);

-- CreateTable
CREATE TABLE "inspector" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,

    CONSTRAINT "inspector_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "inspector_email_key" ON "inspector"("email");

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspection_slot_id_fkey" FOREIGN KEY ("inspection_slot_id") REFERENCES "inspection_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
