-- user_uuid
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_user_uuid_fkey";
ALTER TABLE "inspection_application" DROP CONSTRAINT "inspection_application_user_uuid_fkey";
ALTER TABLE "user_consent" DROP CONSTRAINT "user_consent_user_uuid_fkey";
ALTER TABLE "user_refresh_token" DROP CONSTRAINT "user_refresh_token_user_uuid_fkey";

ALTER TABLE "user"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;
ALTER TABLE "audit_log"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid,
  ALTER COLUMN "user_uuid" SET DATA TYPE uuid USING user_uuid::uuid,
  ADD CONSTRAINT "audit_log_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_application"
  ALTER COLUMN "user_uuid" SET DATA TYPE uuid USING user_uuid::uuid,
  ADD CONSTRAINT "inspection_application_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_consent"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid,
  ALTER COLUMN "user_uuid" SET DATA TYPE uuid USING user_uuid::uuid,
  ADD CONSTRAINT "user_consent_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_refresh_token"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid,
  ALTER COLUMN "user_uuid" SET DATA TYPE uuid USING user_uuid::uuid,
  ADD CONSTRAINT "user_refresh_token_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- schedule_uuid
ALTER TABLE "move_out_schedule_on_inspector" DROP CONSTRAINT "move_out_schedule_on_inspector_schedule_uuid_fkey";
ALTER TABLE "inspection_target" DROP CONSTRAINT "inspection_target_schedule_uuid_fkey";
ALTER TABLE "inspection_slot" DROP CONSTRAINT "inspection_slot_schedule_uuid_fkey";

ALTER TABLE "move_out_schedule"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;
ALTER TABLE "move_out_schedule_on_inspector"
  ALTER COLUMN "schedule_uuid" SET DATA TYPE uuid USING schedule_uuid::uuid,
  ADD CONSTRAINT "move_out_schedule_on_inspector_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_target"
  ALTER COLUMN "schedule_uuid" SET DATA TYPE uuid USING schedule_uuid::uuid,
  ADD CONSTRAINT "inspection_target_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_slot"
  ALTER COLUMN "schedule_uuid" SET DATA TYPE uuid USING schedule_uuid::uuid,
  ADD CONSTRAINT "inspection_slot_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- semester_uuid
ALTER TABLE "move_out_schedule"
  DROP CONSTRAINT "move_out_schedule_current_semester_uuid_fkey",
  DROP CONSTRAINT "move_out_schedule_next_semester_uuid_fkey";

ALTER TABLE "semester"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;
ALTER TABLE "move_out_schedule"
  ALTER COLUMN "current_semester_uuid" SET DATA TYPE uuid USING current_semester_uuid::uuid,
  ALTER COLUMN "next_semester_uuid" SET DATA TYPE uuid USING next_semester_uuid::uuid,
  ADD CONSTRAINT "move_out_schedule_current_semester_uuid_fkey" FOREIGN KEY ("current_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "move_out_schedule_next_semester_uuid_fkey" FOREIGN KEY ("next_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- inspection_target_info_uuid
ALTER TABLE "inspection_application" DROP CONSTRAINT "inspection_application_inspection_target_info_uuid_fkey";

ALTER TABLE "inspection_target"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;
ALTER TABLE "inspection_application"
  ALTER COLUMN "inspection_target_info_uuid" SET DATA TYPE uuid USING inspection_target_info_uuid::uuid,
  ADD CONSTRAINT "inspection_application_inspection_target_info_uuid_fkey" FOREIGN KEY ("inspection_target_info_uuid") REFERENCES "inspection_target"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- inspection_slot_uuid
ALTER TABLE "inspection_application" DROP CONSTRAINT "inspection_application_inspection_slot_uuid_fkey";
ALTER TABLE "inspector_available_slot" DROP CONSTRAINT "inspector_available_slot_inspection_slot_uuid_fkey";

ALTER TABLE "inspection_slot"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;
ALTER TABLE "inspection_application"
  ALTER COLUMN "inspection_slot_uuid" SET DATA TYPE uuid USING inspection_slot_uuid::uuid,
  ADD CONSTRAINT "inspection_application_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspector_available_slot"
  ALTER COLUMN "inspection_slot_uuid" SET DATA TYPE uuid USING inspection_slot_uuid::uuid,
  ADD CONSTRAINT "inspector_available_slot_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- inspection_application
ALTER TABLE "inspection_application"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;

-- inspector_uuid
ALTER TABLE "move_out_schedule_on_inspector" DROP CONSTRAINT "move_out_schedule_on_inspector_inspector_uuid_fkey";
ALTER TABLE "inspection_application" DROP CONSTRAINT "inspection_application_inspector_uuid_fkey";
ALTER TABLE "inspector_available_slot" DROP CONSTRAINT "inspector_available_slot_inspector_uuid_fkey";

ALTER TABLE "inspector"
  ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;
ALTER TABLE "move_out_schedule_on_inspector"
  ALTER COLUMN "inspector_uuid" SET DATA TYPE uuid USING inspector_uuid::uuid,
  ADD CONSTRAINT "move_out_schedule_on_inspector_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_application"
  ALTER COLUMN "inspector_uuid" SET DATA TYPE uuid USING inspector_uuid::uuid,
  ADD CONSTRAINT "inspection_application_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspector_available_slot"
  ALTER COLUMN "inspector_uuid" SET DATA TYPE uuid USING inspector_uuid::uuid,
  ADD CONSTRAINT "inspector_available_slot_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- article_uuid
ALTER TABLE "article" ALTER COLUMN "uuid" SET DATA TYPE uuid USING uuid::uuid;
