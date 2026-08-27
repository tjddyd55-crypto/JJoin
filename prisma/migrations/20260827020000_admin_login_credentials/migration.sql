-- Admin env-bootstrap credentials (JJOIN_ADMIN_LOGIN_ID / JJOIN_ADMIN_LOGIN_PASSWORD).
CREATE TABLE "admin_login_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_login_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_login_credentials_user_id_key" ON "admin_login_credentials"("user_id");
CREATE UNIQUE INDEX "admin_login_credentials_login_id_key" ON "admin_login_credentials"("login_id");

ALTER TABLE "admin_login_credentials" ADD CONSTRAINT "admin_login_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
