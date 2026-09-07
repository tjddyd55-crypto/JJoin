-- Club member age range (nullable pair or unrestricted null/null)
ALTER TABLE "clubs" ADD COLUMN "min_age" INTEGER;
ALTER TABLE "clubs" ADD COLUMN "max_age" INTEGER;
