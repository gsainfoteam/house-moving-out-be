-- CreateTable
CREATE TABLE "move_out_schedule_on_inspector" (
    "schedule_uuid" TEXT NOT NULL,
    "inspector_uuid" TEXT NOT NULL,
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "move_out_schedule_on_inspector_pkey" PRIMARY KEY ("schedule_uuid","inspector_uuid")
);

-- AddForeignKey
ALTER TABLE "move_out_schedule_on_inspector" ADD CONSTRAINT "move_out_schedule_on_inspector_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule_on_inspector" ADD CONSTRAINT "move_out_schedule_on_inspector_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: Link inspectors to the schedules they actually have slots in
INSERT INTO "move_out_schedule_on_inspector" ("schedule_uuid", "inspector_uuid", "is_temporary")
SELECT DISTINCT slot.schedule_uuid, ias.inspector_uuid, false
FROM "inspector_available_slot" ias
JOIN "inspection_slot" slot ON ias.inspection_slot_uuid = slot.uuid;
