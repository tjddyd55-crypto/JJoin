-- Service operator / legal disclosure SSOT (singleton row id = default)

CREATE TABLE "service_operator_profiles" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "business_name" TEXT,
    "brand_name" TEXT,
    "representative_name" TEXT,
    "business_registration_number" TEXT,
    "ecommerce_registration_number" TEXT,
    "corporate_registration_number" TEXT,
    "business_address" TEXT,
    "customer_service_phone" TEXT,
    "customer_service_email" TEXT,
    "customer_service_hours" TEXT,
    "privacy_officer_name" TEXT,
    "privacy_officer_title" TEXT,
    "privacy_department" TEXT,
    "privacy_email" TEXT,
    "privacy_phone" TEXT,
    "payment_inquiry_phone" TEXT,
    "payment_inquiry_email" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "service_operator_profiles_pkey" PRIMARY KEY ("id")
);
