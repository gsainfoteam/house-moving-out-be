-- CreateTable
CREATE TABLE "inspection_slot" (
    "id" TEXT NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "max_capacity" INTEGER NOT NULL DEFAULT 0,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inspection_slot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_slot_schedule_id_start_time_idx" ON "inspection_slot"("schedule_id", "start_time");

-- AddForeignKey
ALTER TABLE "inspection_slot" ADD CONSTRAINT "inspection_slot_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "move_out_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
