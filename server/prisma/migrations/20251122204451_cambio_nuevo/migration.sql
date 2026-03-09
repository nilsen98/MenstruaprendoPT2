-- AlterTable
ALTER TABLE `Usuaria` ADD COLUMN `resetToken` VARCHAR(255) NULL,
    ADD COLUMN `resetTokenExp` DATETIME(3) NULL;
