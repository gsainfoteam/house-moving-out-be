-- CreateEnum
CREATE TYPE "consent_type" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY');

-- CreateEnum
CREATE TYPE "season" AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER');

-- CreateTable
CREATE TABLE "admin" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "admin_refresh_token" (
    "uuid" TEXT NOT NULL,
    "admin_uuid" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_refresh_token_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "user" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "user_refresh_token" (
    "uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_refresh_token_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "user_consent" (
    "uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "consent_type" "consent_type" NOT NULL,
    "version" TEXT NOT NULL,
    "agreed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consent_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "policy_version" (
    "uuid" TEXT NOT NULL,
    "type" "consent_type" NOT NULL,
    "version" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_version_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "uuid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "admin_uuid" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "move_out_schedule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "application_start_time" TIMESTAMP(3) NOT NULL,
    "application_end_time" TIMESTAMP(3) NOT NULL,
    "current_semester_uuid" TEXT NOT NULL,
    "next_semester_uuid" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "move_out_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester" (
    "uuid" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "season" "season" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semester_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspection_target" (
    "uuid" TEXT NOT NULL,
    "current_semester_uuid" TEXT NOT NULL,
    "next_semester_uuid" TEXT NOT NULL,
    "house_name" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "admission_year" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_target_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspection_slot" (
    "uuid" TEXT NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "max_capacity" INTEGER NOT NULL DEFAULT 0,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "male_capacity" INTEGER NOT NULL DEFAULT 0,
    "female_capacity" INTEGER NOT NULL DEFAULT 0,
    "male_reserved_count" INTEGER NOT NULL DEFAULT 0,
    "female_reserved_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inspection_slot_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspection_application" (
    "uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "inspection_target_info_uuid" TEXT NOT NULL,
    "inspection_slot_uuid" TEXT NOT NULL,
    "is_passed" BOOLEAN,
    "re_inspection_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_application_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspector_available_slot" (
    "inspector_uuid" TEXT NOT NULL,
    "inspection_slot_uuid" TEXT NOT NULL,

    CONSTRAINT "inspector_available_slot_pkey" PRIMARY KEY ("inspector_uuid","inspection_slot_uuid")
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
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_token_refresh_token_key" ON "admin_refresh_token"("refresh_token");

-- CreateIndex
CREATE INDEX "admin_refresh_token_admin_uuid_session_id_idx" ON "admin_refresh_token"("admin_uuid", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_refresh_token_refresh_token_key" ON "user_refresh_token"("refresh_token");

-- CreateIndex
CREATE INDEX "user_refresh_token_user_uuid_session_id_idx" ON "user_refresh_token"("user_uuid", "session_id");

-- CreateIndex
CREATE INDEX "user_consent_user_uuid_consent_type_idx" ON "user_consent"("user_uuid", "consent_type");

-- CreateIndex
CREATE INDEX "policy_version_type_is_active_idx" ON "policy_version"("type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "policy_version_type_version_key" ON "policy_version"("type", "version");

-- CreateIndex
CREATE INDEX "audit_log_performed_at_idx" ON "audit_log"("performed_at");

-- CreateIndex
CREATE UNIQUE INDEX "move_out_schedule_current_semester_uuid_next_semester_uuid_key" ON "move_out_schedule"("current_semester_uuid", "next_semester_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "semester_year_season_key" ON "semester"("year", "season");

-- CreateIndex
CREATE INDEX "inspection_target_current_semester_uuid_idx" ON "inspection_target"("current_semester_uuid");

-- CreateIndex
CREATE INDEX "inspection_target_next_semester_uuid_idx" ON "inspection_target"("next_semester_uuid");

-- CreateIndex
CREATE INDEX "inspection_target_current_semester_uuid_next_semester_uuid__idx" ON "inspection_target"("current_semester_uuid", "next_semester_uuid", "house_name", "room_number");

-- CreateIndex
CREATE INDEX "inspection_target_admission_year_student_name_idx" ON "inspection_target"("admission_year", "student_name");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_target_current_semester_uuid_next_semester_uuid__key" ON "inspection_target"("current_semester_uuid", "next_semester_uuid", "admission_year", "student_name");

-- CreateIndex
CREATE INDEX "inspection_slot_schedule_id_start_time_idx" ON "inspection_slot"("schedule_id", "start_time");

-- CreateIndex
CREATE INDEX "inspection_application_inspection_target_info_uuid_idx" ON "inspection_application"("inspection_target_info_uuid");

-- CreateIndex
CREATE INDEX "inspection_application_inspection_slot_uuid_idx" ON "inspection_application"("inspection_slot_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_application_inspection_target_info_uuid_key" ON "inspection_application"("inspection_target_info_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inspector_email_key" ON "inspector"("email");

-- AddForeignKey
ALTER TABLE "admin_refresh_token" ADD CONSTRAINT "admin_refresh_token_admin_uuid_fkey" FOREIGN KEY ("admin_uuid") REFERENCES "admin"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_refresh_token" ADD CONSTRAINT "user_refresh_token_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_uuid_fkey" FOREIGN KEY ("admin_uuid") REFERENCES "admin"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule" ADD CONSTRAINT "move_out_schedule_current_semester_uuid_fkey" FOREIGN KEY ("current_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule" ADD CONSTRAINT "move_out_schedule_next_semester_uuid_fkey" FOREIGN KEY ("next_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_target" ADD CONSTRAINT "inspection_target_current_semester_uuid_fkey" FOREIGN KEY ("current_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_target" ADD CONSTRAINT "inspection_target_next_semester_uuid_fkey" FOREIGN KEY ("next_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_slot" ADD CONSTRAINT "inspection_slot_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "move_out_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspection_target_info_uuid_fkey" FOREIGN KEY ("inspection_target_info_uuid") REFERENCES "inspection_target"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
