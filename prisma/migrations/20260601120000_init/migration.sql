-- CreateEnum
CREATE TYPE "consent_type" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY');

-- CreateEnum
CREATE TYPE "schedule_status" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "season" AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "room_inspection_type" AS ENUM ('FULL', 'SOLO', 'EMPTY');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "article_type" AS ENUM ('NOTICE', 'FAQ');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('PASSED', 'FAILED', 'PENDING_NO_SHOW', 'NO_SHOW', 'CANCELED', 'NO_SHOW_CANCELED');

-- CreateTable
CREATE TABLE "user" (
    "uuid" UUID NOT NULL,
    "student_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'USER',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "user_refresh_token" (
    "uuid" UUID NOT NULL,
    "user_uuid" UUID NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_refresh_token_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "user_consent" (
    "uuid" UUID NOT NULL,
    "user_uuid" UUID NOT NULL,
    "consent_type" "consent_type" NOT NULL,
    "version" TEXT NOT NULL,
    "agreed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consent_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "uuid" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "user_uuid" UUID NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "move_out_schedule" (
    "uuid" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "application_start_time" TIMESTAMP(3) NOT NULL,
    "application_end_time" TIMESTAMP(3) NOT NULL,
    "current_semester_uuid" UUID NOT NULL,
    "next_semester_uuid" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "schedule_status" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "move_out_schedule_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "move_out_schedule_on_inspector" (
    "schedule_uuid" UUID NOT NULL,
    "inspector_uuid" UUID NOT NULL,
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "move_out_schedule_on_inspector_pkey" PRIMARY KEY ("schedule_uuid","inspector_uuid")
);

-- CreateTable
CREATE TABLE "semester" (
    "uuid" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "season" "season" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semester_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspection_target" (
    "uuid" UUID NOT NULL,
    "schedule_uuid" UUID NOT NULL,
    "house_name" TEXT NOT NULL,
    "gender" "gender" NOT NULL,
    "room_number" TEXT NOT NULL,
    "room_capacity" INTEGER NOT NULL,
    "student1_name" TEXT,
    "student1_student_number" TEXT,
    "student2_name" TEXT,
    "student2_student_number" TEXT,
    "student3_name" TEXT,
    "student3_student_number" TEXT,
    "student_hashes" TEXT[],
    "apply_cleaning_service" BOOLEAN NOT NULL DEFAULT false,
    "apply_repair_check" BOOLEAN NOT NULL DEFAULT false,
    "inspection_type" "room_inspection_type" NOT NULL,
    "inspection_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_target_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspection_slot" (
    "uuid" UUID NOT NULL,
    "schedule_uuid" UUID NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "gender" "gender" NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inspection_slot_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspection_application" (
    "uuid" UUID NOT NULL,
    "user_uuid" UUID NOT NULL,
    "inspection_target_info_uuid" UUID NOT NULL,
    "inspection_slot_uuid" UUID NOT NULL,
    "status" "application_status",
    "item_results" JSONB,
    "additional_comment" TEXT,
    "document" TEXT,
    "is_document_active" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "inspector_uuid" UUID NOT NULL,
    "inspection_count" INTEGER NOT NULL,

    CONSTRAINT "inspection_application_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspector_available_slot" (
    "inspector_uuid" UUID NOT NULL,
    "inspection_slot_uuid" UUID NOT NULL,

    CONSTRAINT "inspector_available_slot_pkey" PRIMARY KEY ("inspector_uuid","inspection_slot_uuid")
);

-- CreateTable
CREATE TABLE "inspector" (
    "uuid" UUID NOT NULL,
    "student_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,
    "gender" "gender" NOT NULL,

    CONSTRAINT "inspector_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "article" (
    "uuid" UUID NOT NULL,
    "type" "article_type" NOT NULL,
    "title_ko" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "content_ko" TEXT NOT NULL,
    "content_en" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "article_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_student_hash_key" ON "user"("student_hash");

-- CreateIndex
CREATE UNIQUE INDEX "user_refresh_token_refresh_token_key" ON "user_refresh_token"("refresh_token");

-- CreateIndex
CREATE INDEX "user_refresh_token_user_uuid_session_id_idx" ON "user_refresh_token"("user_uuid", "session_id");

-- CreateIndex
CREATE INDEX "user_consent_user_uuid_consent_type_idx" ON "user_consent"("user_uuid", "consent_type");

-- CreateIndex
CREATE INDEX "audit_log_performed_at_idx" ON "audit_log"("performed_at");

-- CreateIndex
CREATE UNIQUE INDEX "semester_year_season_key" ON "semester"("year", "season");

-- CreateIndex
CREATE INDEX "inspection_target_schedule_uuid_idx" ON "inspection_target"("schedule_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_target_schedule_uuid_house_name_room_number_key" ON "inspection_target"("schedule_uuid", "house_name", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_slot_schedule_uuid_start_time_end_time_gender_key" ON "inspection_slot"("schedule_uuid", "start_time", "end_time", "gender");

-- CreateIndex
CREATE INDEX "inspection_application_inspection_slot_uuid_idx" ON "inspection_application"("inspection_slot_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inspector_student_hash_key" ON "inspector"("student_hash");

-- 활성화된 Application에 대한 Unique 제약 (수동 추가)
CREATE UNIQUE INDEX "unique_active_application" ON "inspection_application"("inspection_target_info_uuid") WHERE "deleted_at" IS NULL AND ("status" IS NULL OR "status" = 'PENDING_NO_SHOW');

-- Enforce that only one active SUPERADMIN exists.
CREATE UNIQUE INDEX "unique_active_superadmin" ON "user"("role") WHERE "deleted_at" IS NULL AND "role" = 'SUPERADMIN';

-- 수동 추가된 Check 제약 조건
ALTER TABLE "inspection_slot" ADD CONSTRAINT "InspectionSlot_reservedCount_check" CHECK ("reserved_count" >= 0);
ALTER TABLE "inspection_target" ADD CONSTRAINT "InspectionTargetInfo_inspectionCount_check" CHECK ("inspection_count" >= 0);

-- AddForeignKey
ALTER TABLE "user_refresh_token" ADD CONSTRAINT "user_refresh_token_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule" ADD CONSTRAINT "move_out_schedule_current_semester_uuid_fkey" FOREIGN KEY ("current_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule" ADD CONSTRAINT "move_out_schedule_next_semester_uuid_fkey" FOREIGN KEY ("next_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule_on_inspector" ADD CONSTRAINT "move_out_schedule_on_inspector_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule_on_inspector" ADD CONSTRAINT "move_out_schedule_on_inspector_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_target" ADD CONSTRAINT "inspection_target_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_slot" ADD CONSTRAINT "inspection_slot_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspection_target_info_uuid_fkey" FOREIGN KEY ("inspection_target_info_uuid") REFERENCES "inspection_target"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
