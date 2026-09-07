-- Android production APK release metadata (singleton).
CREATE TABLE "android_mobile_release_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "latest_version_code" INTEGER NOT NULL DEFAULT 0,
    "latest_version_name" TEXT NOT NULL DEFAULT '0.0.0',
    "apk_url" TEXT NOT NULL DEFAULT '',
    "release_notes" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "android_mobile_release_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "android_mobile_release_settings" ("id", "latest_version_code", "latest_version_name", "apk_url", "updated_at")
VALUES ('default', 0, '0.0.0', '', NOW());
