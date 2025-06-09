-- CreateTable
CREATE TABLE "emotion_logs" (
    "id" TEXT NOT NULL,
    "email_subject" TEXT NOT NULL,
    "email_body" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "originalEmotion" TEXT,
    "from_name" TEXT,
    "from_email" TEXT,
    "to_email" TEXT,
    "message_id" TEXT,
    "date" TIMESTAMP(3),
    "postmark_response" JSONB,
    "analysis" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "attachment" JSONB,

    CONSTRAINT "emotion_logs_pkey" PRIMARY KEY ("id")
);
