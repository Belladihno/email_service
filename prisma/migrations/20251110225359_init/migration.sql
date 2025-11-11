-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "notification_id" TEXT,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "template_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuit_breaker_states" (
    "id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'closed',
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_failure_time" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuit_breaker_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_request_id_key" ON "email_logs"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_notification_id_key" ON "email_logs"("notification_id");

-- CreateIndex
CREATE INDEX "email_logs_request_id_idx" ON "email_logs"("request_id");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_user_id_idx" ON "email_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "circuit_breaker_states_service_name_key" ON "circuit_breaker_states"("service_name");
