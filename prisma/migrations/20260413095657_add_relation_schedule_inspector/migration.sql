-- AlterTable
ALTER TABLE "inspector" ADD COLUMN     "is_temporary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "move_out_schedule_on_inspector" (
    "schedule_uuid" TEXT NOT NULL,
    "inspector_uuid" TEXT NOT NULL,

    CONSTRAINT "move_out_schedule_on_inspector_pkey" PRIMARY KEY ("schedule_uuid","inspector_uuid")
);

-- AddForeignKey
ALTER TABLE "move_out_schedule_on_inspector" ADD CONSTRAINT "move_out_schedule_on_inspector_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule_on_inspector" ADD CONSTRAINT "move_out_schedule_on_inspector_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
