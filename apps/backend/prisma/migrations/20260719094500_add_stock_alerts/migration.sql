-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL,
    "currentQty" DECIMAL(10,3) NOT NULL,
    "alertQty" DECIMAL(10,3) NOT NULL,
    "isOutOfStock" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_alerts_productId_idx" ON "stock_alerts"("productId");

-- CreateIndex
CREATE INDEX "stock_alerts_readAt_idx" ON "stock_alerts"("readAt");

-- CreateIndex
CREATE INDEX "stock_alerts_createdAt_idx" ON "stock_alerts"("createdAt");

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
