// server/prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const modulesData = [
  { nombre: 'Preadolescencia', descripcion: 'Nivel principiante' },
  { nombre: 'Cambios en la menstruación', descripcion: 'Nivel cambios' },
  { nombre: 'Ciclo menstrual', descripcion: 'Nivel conoces tu ciclo' },
  { nombre: 'Síntomas en la menstruación', descripcion: 'Nivel te preocupas por tu ciclo' },
  { nombre: '¿Cómo afecta la alimentación y ejercicio?', descripcion: 'Nivel vas más allá' },
  { nombre: '¿Qué hacer durante la menstruación?', descripcion: 'Nivel es hora de actuar' },
  { nombre: 'Importancia del seguimiento del periodo', descripcion: 'Nivel consciencia' },
  { nombre: 'Lo que nunca debes creer de tu periodo', descripcion: 'Nivel ya nada te para' },
];

async function main() {
  console.log('🌱 Seed integral iniciado…');

  // --- Tutor
  const tutor = await prisma.tutor.upsert({
    where: { correo: 'tutor@example.com' },
    update: { nombre: 'María López' },
    create: { nombre: 'María López', correo: 'tutor@example.com' },
  });

  // --- Usuarias
  const passHash1 = await bcrypt.hash('12345678', 10);
  const passHash2 = await bcrypt.hash('12345678', 10);

  const usuariaConTutor = await prisma.usuaria.upsert({
    where: { email: 'ana@example.com' },
    update: { nombre: 'Ana', apellido: 'Pérez', tutorId: tutor.id },
    create: {
      email: 'ana@example.com',
      passwordHash: passHash1,
      nombre: 'Ana',
      apellido: 'Pérez',
      fechaNacimiento: new Date('2010-05-20'),
      tutorId: tutor.id,
    },
  });

  const usuariaSinTutor = await prisma.usuaria.upsert({
    where: { email: 'camila@example.com' },
    update: { nombre: 'Camila', apellido: 'García', tutorId: null },
    create: {
      email: 'camila@example.com',
      passwordHash: passHash2,
      nombre: 'Camila',
      apellido: 'García',
      fechaNacimiento: new Date('2011-02-10'),
      tutorId: null,
    },
  });

  // --- Módulos
  for (const m of modulesData) {
    await prisma.modulo.upsert({
      where: { nombre: m.nombre },
      update: { descripcion: m.descripcion, contenido: null },
      create: { nombre: m.nombre, descripcion: m.descripcion, contenido: null },
    });
  }
  const modulos = await prisma.modulo.findMany({ orderBy: { id: 'asc' } });
// --- Puntuaciones (solo 8 o 10; el front no guarda < 8)
await prisma.puntuacionModulo.upsert({
  where: { usuariaId_moduloId: { usuariaId: usuariaConTutor.id, moduloId: modulos[0].id } },
  update: { puntuacion: 8 },
  create: { usuariaId: usuariaConTutor.id, moduloId: modulos[0].id, puntuacion: 8 },
});

await prisma.puntuacionModulo.upsert({
  where: { usuariaId_moduloId: { usuariaId: usuariaConTutor.id, moduloId: modulos[1].id } },
  update: { puntuacion: 10 },
  create: { usuariaId: usuariaConTutor.id, moduloId: modulos[1].id, puntuacion: 10 },
});

await prisma.puntuacionModulo.upsert({
  where: { usuariaId_moduloId: { usuariaId: usuariaSinTutor.id, moduloId: modulos[2].id } },
  update: { puntuacion: 8 },
  create: { usuariaId: usuariaSinTutor.id, moduloId: modulos[2].id, puntuacion: 8 },
});


  // --- Periodos + PeriodoDia (incluye uno que cruza de mes)
  // Usuaria con tutor: 1–3 septiembre 2025
  const p1 = await prisma.periodo.create({
    data: {
      usuariaId: usuariaConTutor.id,
      fechaInicio: new Date('2025-09-01'),
      fechaFin: new Date('2025-09-03'),
    },
  });
  await prisma.periodoDia.createMany({
    data: [
      { periodoId: p1.id, fecha: new Date('2025-09-01'), flujo: 'LIGERO', animo: 'FELIZ' },
      { periodoId: p1.id, fecha: new Date('2025-09-02'), flujo: 'ABUNDANTE', animo: 'TRISTE' },
      { periodoId: p1.id, fecha: new Date('2025-09-03'), flujo: 'MODERADO', animo: 'FELIZ' },
    ],
  });

  // Usuaria con tutor: 30 sep – 2 oct 2025 (cruza de mes)
  const p2 = await prisma.periodo.create({
    data: {
      usuariaId: usuariaConTutor.id,
      fechaInicio: new Date('2025-09-30'),
      fechaFin: new Date('2025-10-02'),
    },
  });
  await prisma.periodoDia.createMany({
    data: [
      { periodoId: p2.id, fecha: new Date('2025-09-30'), flujo: 'LIGERO', animo: 'FELIZ' },
      { periodoId: p2.id, fecha: new Date('2025-10-01'), flujo: 'ABUNDANTE', animo: 'TRISTE' },
      { periodoId: p2.id, fecha: new Date('2025-10-02'), flujo: 'MODERADO', animo: 'FELIZ' },
    ],
  });

  // Usuaria sin tutor: 10–12 agosto 2025
  const p3 = await prisma.periodo.create({
    data: {
      usuariaId: usuariaSinTutor.id,
      fechaInicio: new Date('2025-08-10'),
      fechaFin: new Date('2025-08-12'),
    },
  });
  await prisma.periodoDia.createMany({
    data: [
      { periodoId: p3.id, fecha: new Date('2025-08-10'), flujo: 'MODERADO', animo: 'FELIZ' },
      { periodoId: p3.id, fecha: new Date('2025-08-11'), flujo: 'ABUNDANTE', animo: 'TRISTE' },
      { periodoId: p3.id, fecha: new Date('2025-08-12'), flujo: 'LIGERO', animo: 'ENOJADA' },
    ],
  });

  // --- Reportes (regla año/mes, uno por usuaria+tutor+mes)
  // Para usuaria con tutor: septiembre y octubre 2025
  await prisma.reporte.upsert({
    where: {
      usuariaId_tutorId_anio_mes: {
        usuariaId: usuariaConTutor.id,
        tutorId: tutor.id,
        anio: 2025,
        mes: 9,
      },
    },
    update: { contenido: 'Resumen de septiembre', enviadoAt: new Date('2025-10-01T09:00:00Z') },
    create: {
      usuariaId: usuariaConTutor.id,
      tutorId: tutor.id,
      anio: 2025,
      mes: 9,
      contenido: 'Resumen de septiembre',
      enviadoAt: new Date('2025-10-01T09:00:00Z'),
    },
  });

  await prisma.reporte.upsert({
    where: {
      usuariaId_tutorId_anio_mes: {
        usuariaId: usuariaConTutor.id,
        tutorId: tutor.id,
        anio: 2025,
        mes: 10,
      },
    },
    update: { contenido: 'Resumen de octubre', enviadoAt: null },
    create: {
      usuariaId: usuariaConTutor.id,
      tutorId: tutor.id,
      anio: 2025,
      mes: 10,
      contenido: 'Resumen de octubre',
      enviadoAt: null,
    },
  });

  console.log('✅ Seed integral completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
