-- CreateTable
CREATE TABLE `Tutor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `correo` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `Tutor_correo_key`(`correo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuaria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `nombre` VARCHAR(80) NOT NULL,
    `apellido` VARCHAR(80) NOT NULL,
    `fechaNacimiento` DATETIME(3) NOT NULL,
    `tutorId` INTEGER NULL,

    UNIQUE INDEX `Usuaria_email_key`(`email`),
    INDEX `Usuaria_tutorId_idx`(`tutorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Periodo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuariaId` INTEGER NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NULL,
    `flujo` ENUM('LIGERO', 'MODERADO', 'ABUNDANTE') NULL,
    `animo` ENUM('FELIZ', 'TRISTE', 'ENOJADA') NULL,

    INDEX `Periodo_usuariaId_fechaInicio_idx`(`usuariaId`, `fechaInicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Modulo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(80) NOT NULL,
    `descripcion` TEXT NULL,
    `contenido` JSON NULL,

    UNIQUE INDEX `Modulo_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PuntuacionModulo` (
    `usuariaId` INTEGER NOT NULL,
    `moduloId` INTEGER NOT NULL,
    `puntuacion` INTEGER NOT NULL DEFAULT 0,

    INDEX `PuntuacionModulo_moduloId_idx`(`moduloId`),
    PRIMARY KEY (`usuariaId`, `moduloId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuariaId` INTEGER NOT NULL,
    `tutorId` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `contenido` TEXT NULL,
    `enviadoAt` DATETIME(3) NULL,

    INDEX `Reporte_anio_mes_idx`(`anio`, `mes`),
    UNIQUE INDEX `Reporte_usuariaId_tutorId_anio_mes_key`(`usuariaId`, `tutorId`, `anio`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuaria` ADD CONSTRAINT `Usuaria_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `Tutor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Periodo` ADD CONSTRAINT `Periodo_usuariaId_fkey` FOREIGN KEY (`usuariaId`) REFERENCES `Usuaria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PuntuacionModulo` ADD CONSTRAINT `PuntuacionModulo_usuariaId_fkey` FOREIGN KEY (`usuariaId`) REFERENCES `Usuaria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PuntuacionModulo` ADD CONSTRAINT `PuntuacionModulo_moduloId_fkey` FOREIGN KEY (`moduloId`) REFERENCES `Modulo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reporte` ADD CONSTRAINT `Reporte_usuariaId_fkey` FOREIGN KEY (`usuariaId`) REFERENCES `Usuaria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reporte` ADD CONSTRAINT `Reporte_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `Tutor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
