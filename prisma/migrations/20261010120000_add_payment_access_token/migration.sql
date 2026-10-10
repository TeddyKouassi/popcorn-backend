-- Additive migration: protects guest payment endpoints without changing data.
ALTER TABLE "orders" ADD COLUMN "paymentAccessTokenHash" TEXT;

CREATE UNIQUE INDEX "orders_paymentAccessTokenHash_key"
ON "orders"("paymentAccessTokenHash");
