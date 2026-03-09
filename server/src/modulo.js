import { Router } from 'express';
import { prisma } from './db.js';
import { auth } from './auth.js';

const router = Router();

const MAX_MODULOS = 8;

// ✅ helper: calcula el módulo actual pendiente según puntuaciones (>=8 = completado)
function getModuloActual(scores, maxModulos = MAX_MODULOS) {
  const map = new Map(scores.map(s => [s.moduloId, s.puntuacion]));
  for (let m = 1; m <= maxModulos; m++) {
    const p = map.get(m);
    if (!(p >= 8)) return m;
  }
  return maxModulos;
}

// GET /api/modulos
router.get('/', async (_req, res) => {
  try {
    const modulos = await prisma.modulo.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, nombre: true, descripcion: true, contenido: true }
    });
    res.json(modulos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo listar módulos' });
  }
});

// GET /api/modulos/scores
router.get('/scores', auth, async (req, res) => {
  try {
    const scores = await prisma.puntuacionModulo.findMany({
      where: { usuariaId: req.user.id },
      select: { moduloId: true, puntuacion: true },
      orderBy: { moduloId: 'asc' },
    });
    res.json(scores);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron obtener las puntuaciones' });
  }
});

// ✅ GET /api/modulos/progreso  -> para saber qué módulo está desbloqueado
router.get('/progreso', auth, async (req, res) => {
  try {
    const scores = await prisma.puntuacionModulo.findMany({
      where: { usuariaId: req.user.id },
      select: { moduloId: true, puntuacion: true },
      orderBy: { moduloId: 'asc' },
    });

    const moduloActual = getModuloActual(scores);
    res.json({ moduloActual });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo obtener el progreso' });
  }
});

// POST /api/modulos/:moduloId/score   body: { puntuacion: 8|10 }
router.post('/:moduloId/score', auth, async (req, res) => {
  try {
    const moduloId = Number(req.params.moduloId);
   const puntuacion = Number(req.body.puntuacion);

    if (!Number.isInteger(moduloId) || moduloId < 1 || moduloId > MAX_MODULOS) {
      return res.status(400).json({ error: 'moduloId inválido' });
    }
    if (!Number.isInteger(puntuacion) || ![8, 9, 10].includes(puntuacion)) {
      return res.status(400).json({ error: 'Puntuación permitida: 8, 9 o 10' });
    }

    // ✅ calcular el moduloActual ANTES de guardar (para bloquear)
    const scores = await prisma.puntuacionModulo.findMany({
      where: { usuariaId: req.user.id },
      select: { moduloId: true, puntuacion: true },
      orderBy: { moduloId: 'asc' },
    });
    const moduloActual = getModuloActual(scores);

    // ✅ bloqueo secuencial: no permitir guardar score de módulos futuros
    if (moduloId > moduloActual) {
      return res.status(403).json({
        error: `Módulo bloqueado. Primero completa el módulo ${moduloActual}.`,
        moduloActual,
      });
    }

    // ✅ buscar score existente y quedarnos con el más alto
const existing = await prisma.puntuacionModulo.findUnique({
  where: { usuariaId_moduloId: { usuariaId: req.user.id, moduloId } },
  select: { puntuacion: true },
});

const mejor = existing ? Math.max(existing.puntuacion, puntuacion) : puntuacion;

const score = await prisma.puntuacionModulo.upsert({
  where: { usuariaId_moduloId: { usuariaId: req.user.id, moduloId } },
  update: { puntuacion: mejor },
  create: { usuariaId: req.user.id, moduloId, puntuacion: mejor },
});

// ✅ recalcular progreso para responder actualizado (opcional)
const scores2 = [
  ...scores.filter(s => s.moduloId !== moduloId),
  { moduloId, puntuacion: mejor },
];
const moduloActualNuevo = getModuloActual(scores2);

res.json({ score, progreso: { moduloActual: moduloActualNuevo } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo guardar puntuación' });
  }
});

export default router;