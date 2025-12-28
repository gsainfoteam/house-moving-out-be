-- CreateTable
CREATE TABLE "move_out_schedule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "application_start_date" DATE NOT NULL,
    "application_end_date" DATE NOT NULL,
    "inspection_start_date" DATE NOT NULL,
    "inspection_end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "move_out_schedule_pkey" PRIMARY KEY ("id")
);
