/*
  Warnings:

  - You are about to drop the column `animo` on the `Periodo` table. All the data in the column will be lost.
  - You are about to drop the column `flujo` on the `Periodo` table. All the data in the column will be lost.
  - Made the column `fechaFin` on table `Periodo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Periodo` DROP COLUMN `animo`,
    DROP COLUMN `flujo`,
    MODIFY `fechaFin` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `PeriodoDia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodoId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `flujo` ENUM('LIGERO', 'MODERADO', 'ABUNDANTE') NOT NULL,
    `animo` ENUM('FELIZ', 'TRISTE', 'ENOJADA') NOT NULL,

    INDEX `PeriodoDia_fecha_idx`(`fecha`),
    UNIQUE INDEX `PeriodoDia_periodoId_fecha_key`(`periodoId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Periodo_usuariaId_fechaFin_idx` ON `Periodo`(`usuariaId`, `fechaFin`);

-- AddForeignKey
ALTER TABLE `PeriodoDia` ADD CONSTRAINT `PeriodoDia_periodoId_fkey` FOREIGN KEY (`periodoId`) REFERENCES `Periodo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
