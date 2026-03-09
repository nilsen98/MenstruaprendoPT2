// server/src/periodo.js
import { Router } from 'express';
import { prisma } from './db.js';
import { auth } from './auth.js';

const router = Router();

// ------- helpers -------
const MS_DAY = 24 * 60 * 60 * 1000;

// normaliza a las 00:00:00 (UTC) para comparar por día
function asDateOnly(d) {
  const x = new Date(d);
  if (isNaN(x)) return null;
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

function isYYYYMM(s) {
  return /^\d{4}-\d{2}$/.test(s);
}

// hay traslape con [fi, ff], o existe un periodo abierto
async function hayTraslape(usuariaId, fi, ff) {
  const overlap = await prisma.periodo.findFirst({
    where: {
      usuariaId,
      OR: [
        { fechaFin: null }, // periodo abierto
        {
          AND: [
            { fechaInicio: { lte: ff } },
            { fechaFin: { gte: fi } },
          ],
        },
      ],
    },
    select: { id: true },
  });
  return !!overlap;
}

// ------- ENDPOINTS -------

// POST /api/periodos
// body: { fechaInicio, fechaFin? }
// - si falta fechaFin, se considera periodo de 1 día (fechaFin=fechaInicio)
// - si ya existe un periodo abierto o traslapado, bloquea
router.post('/', auth, async (req, res) => {
  try {
    const fi = asDateOnly(req.body?.fechaInicio);
    const ff = req.body?.fechaFin ? asDateOnly(req.body?.fechaFin) : fi;

    if (!fi) return res.status(400).json({ error: 'fechaInicio es requerida (YYYY-MM-DD)' });
    if (!ff || ff < fi) return res.status(400).json({ error: 'Rango de fechas inválido' });

    const traslape = await hayTraslape(req.user.id, fi, ff);
    if (traslape) return res.status(409).json({ error: 'Ya existe un periodo abierto o traslapado' });

    const periodo = await prisma.periodo.create({
      data: { usuariaId: req.user.id, fechaInicio: fi, fechaFin: ff },
    });

    res.status(201).json(periodo);
  } catch (e) {
    console.error('Crear periodo - error:', e);
    res.status(500).json({ error: 'No se pudo crear el periodo' });
  }
});

// POST /api/periodos/dias
// body: { fecha, flujo, animo }
// Lógica:
//  - Si no hay periodo abierto => abre uno con fechaInicio=fecha y fechaFin=null
//  - Si hay abierto:
//      * si es el primer día del periodo: inserta; ajusta fechaInicio si el día es anterior
//      * si diff > 1 día desde el último día → cierra el periodo con lastDay y abre uno nuevo
//      * en otro caso, inserta dentro del mismo periodo y actualiza fechaFin si corresponde
router.post('/dias', auth, async (req, res) => {
  try {
    const { fecha, flujo, animo } = req.body;
    const day = asDateOnly(fecha);
    if (!day || !flujo || !animo) {
      return res.status(400).json({ error: 'fecha, flujo y animo son requeridos (fecha YYYY-MM-DD)' });
    }

    const usuariaId = req.user.id;

    // periodo abierto con último día
    let abierto = await prisma.periodo.findFirst({
      where: { usuariaId, fechaFin: null },
      include: { dias: { orderBy: { fecha: 'desc' }, take: 1 } },
    });

    if (!abierto) {
      // abrir uno nuevo sin fechaFin
      const nuevo = await prisma.periodo.create({
        data: { usuariaId, fechaInicio: day, fechaFin: null },
      });
      const dia = await prisma.periodoDia.create({
        data: { periodoId: nuevo.id, fecha: day, flujo, animo },
      });
      return res.status(201).json({ periodoId: nuevo.id, dia });
    }

    const lastDay = abierto.dias[0]?.fecha ? asDateOnly(abierto.dias[0].fecha) : null;

    if (!lastDay) {
      // periodo abierto sin días aún: ajusta fechaInicio si el primer día es anterior
      if (day < abierto.fechaInicio) {
        await prisma.periodo.update({
          where: { id: abierto.id },
          data: { fechaInicio: day },
        });
      }
      const dia = await prisma.periodoDia.create({
        data: { periodoId: abierto.id, fecha: day, flujo, animo },
      });
      return res.status(201).json({ periodoId: abierto.id, dia });
    }

    const diffDays = Math.floor((day - lastDay) / MS_DAY);

    if (diffDays > 1) {
      // hubo hueco > 1 día → cerrar periodo con lastDay y abrir uno nuevo
      await prisma.periodo.update({
        where: { id: abierto.id },
        data: { fechaFin: lastDay },
      });
      const nuevo = await prisma.periodo.create({
        data: { usuariaId, fechaInicio: day, fechaFin: null },
      });
      const dia = await prisma.periodoDia.create({
        data: { periodoId: nuevo.id, fecha: day, flujo, animo },
      });
      return res.status(201).json({ periodoId: nuevo.id, dia, cerradoAnterior: true });
    }

    // diffDays <= 1 → mismo periodo
    // si el día es anterior al inicio, ajusta inicio
    if (day < abierto.fechaInicio) {
      await prisma.periodo.update({
        where: { id: abierto.id },
        data: { fechaInicio: day },
      });
    }

    const dia = await prisma.periodoDia.create({
      data: { periodoId: abierto.id, fecha: day, flujo, animo },
    });

    return res.status(201).json({ periodoId: abierto.id, dia });
  } catch (e) {
    if (e?.code === 'P2002') {
      // @@unique([periodoId, fecha])
      return res.status(409).json({ error: 'Ya existe un registro para ese día en el periodo' });
    }
    console.error('Registrar día - error:', e);
    res.status(500).json({ error: 'No se pudo registrar el día' });
  }
});

// PATCH /api/periodos/:id/cerrar
// body: { fechaFin }
// Cierra manualmente un periodo abierto
router.patch('/:id/cerrar', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fin = asDateOnly(req.body?.fechaFin);
    if (!fin) return res.status(400).json({ error: 'fechaFin es requerida (YYYY-MM-DD)' });

    const p = await prisma.periodo.findUnique({ where: { id } });
    if (!p || p.usuariaId !== req.user.id) return res.status(404).json({ error: 'Periodo no encontrado' });
    const inicio = asDateOnly(p.fechaInicio);
    if (fin < inicio) return res.status(400).json({ error: 'fechaFin no puede ser menor que fechaInicio' });

    const updated = await prisma.periodo.update({
      where: { id },
      data: { fechaFin: fin },
    });
    res.json(updated);
  } catch (e) {
    console.error('Cerrar periodo - error:', e);
    res.status(500).json({ error: 'No se pudo cerrar el periodo' });
  }
});

// GET /api/periodos?mes=YYYY-MM
// Lista periodos del usuario (incluye días). Si pasas ?mes, filtra por intersección con ese mes.
router.get('/', auth, async (req, res) => {
  try {
    const { mes } = req.query;
    let where = { usuariaId: req.user.id };

    if (mes) {
      if (!isYYYYMM(mes)) return res.status(400).json({ error: 'Formato de mes inválido. Usa YYYY-MM' });
      const start = asDateOnly(`${mes}-01`);
      const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      const end = new Date(next.getTime() - 1); // fin del mes

      // intersección: inicio <= finMes && (fin >= inicioMes || fin es null)
      where = {
        ...where,
        AND: [
          { fechaInicio: { lte: end } },
          {
            OR: [
              { fechaFin: { gte: start } },
              { fechaFin: null },
            ],
          },
        ],
      };
    }

    const data = await prisma.periodo.findMany({
      where,
      orderBy: [{ fechaInicio: 'desc' }, { id: 'desc' }],
      include: { dias: { orderBy: { fecha: 'asc' } } },
    });

    res.json(data);
  } catch (e) {
    console.error('Listar periodos - error:', e);
    res.status(500).json({ error: 'No se pudieron listar periodos' });
  }
});

// DELETE /api/periodos/dias/:diaId
// Borra un PeriodoDia y recalcula inicio/fin del periodo si aplica
router.delete('/dias/:diaId', auth, async (req, res) => {
  try {
    const diaId = Number(req.params.diaId);

    const dia = await prisma.periodoDia.findUnique({
      where: { id: diaId },
      include: { periodo: true },
    });
    if (!dia || dia.periodo.usuariaId !== req.user.id) {
      return res.status(404).json({ error: 'Día no encontrado' });
    }

    const periodoId = dia.periodoId;

    await prisma.periodoDia.delete({ where: { id: diaId } });

    const diasRestantes = await prisma.periodoDia.findMany({
      where: { periodoId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true },
    });

    if (diasRestantes.length === 0) {
      await prisma.periodo.delete({ where: { id: periodoId } });
      return res.json({ ok: true, periodoEliminado: true });
    }

    const nuevaInicio = diasRestantes[0].fecha;
    const nuevaFin = diasRestantes[diasRestantes.length - 1].fecha;

    await prisma.periodo.update({
      where: { id: periodoId },
      data: {
        fechaInicio: nuevaInicio,
        fechaFin: dia.periodo.fechaFin ? nuevaFin : null, 
        // si estaba abierto, se mantiene abierto
      },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('Eliminar día - error:', e);
    res.status(500).json({ error: 'No se pudo eliminar el día' });
  }
});

export default router;
