-- CreateTable
CREATE TABLE "municipalities" (
    "codigo_divipola" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "departamento_codigo" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("codigo_divipola")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_label_key" ON "municipalities"("label");

-- CreateIndex
CREATE INDEX "municipalities_departamento_idx" ON "municipalities"("departamento");

