import { Router } from 'express';
import { prisma } from './db.js';
import { auth } from './auth.js';

const router = Router();
const MS_DAY = 24 * 60 * 60 * 1000;

function daysBetweenUTC(a, b) {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((db - da) / MS_DAY);
}

// "teórica" vs "ajustada a futuro" ======
function startOfUTCDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d, days) {
  return new Date(d.getTime() + days * MS_DAY);
}

/**
 * Recibe fecha teórica y, si ya quedó en el pasado, la empuja
 * por ciclos hasta que quede >= hoy (UTC day).
 */
function adjustToFuture(baseDate, cycleDays, now = new Date()) {
  const today = startOfUTCDay(now);
  let future = startOfUTCDay(baseDate);

  // Evita loops raros si llega 0 o negativo
  const step = Math.max(1, Math.round(cycleDays));

  while (future < today) {
    future = addDaysUTC(future, step);
  }

  return { today, future };
}

function linearRegression(xs, ys) {
  //  y = a + b x
  const n = xs.length;
  if (n === 0) return null;
  if (n === 1) return { a: ys[0], b: 0 };

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }

  const b = den === 0 ? 0 : num / den;
  const a = meanY - b * meanX;
  return { a, b };
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export function predecirProximoInicio(startDates) {
  const BASELINE_DAYS = 28;
  const TOL = 8; // tolerancia ±8 días 

  if (!startDates || startDates.length === 0) {
    return { ok: false, reason: 'Sin registros de periodo' };
  }

  // Orden ascendente
  const starts = [...startDates].sort((a, b) => a.getTime() - b.getTime());
  const n = starts.length;

  // Caso A: 1 periodo (0 ciclos) => baseline 28
  if (n === 1) {
    const lastStart = starts[0];
    const cycleDays = BASELINE_DAYS;

    // ✅ fecha teórica  lastStart + 28
    const baseNextStart = addDaysUTC(lastStart, cycleDays);

    // ✅ fecha ajustada al futuro 
    const { today, future } = adjustToFuture(baseNextStart, cycleDays);

    return {
      ok: true,
      method: 'baseline',
      cyclesUsed: 0,
      predictedCycleLengthDays: cycleDays,

      // Teórica 
      nextPeriodStart: baseNextStart.toISOString(),

      // Ajustada al futuro 
      adjustedNextPeriodStart: future.toISOString(),
      daysRemaining: daysBetweenUTC(today, future),

      note: 'Predicción aproximada por historial insuficiente.',
    };
  }

  // Construir ciclos (duraciones) Li = S(i+1) - Si
  // Guardamos también el índice x = 1..k para regresión
  const rawCycles = [];
  for (let i = 1; i < n; i++) {
    const L = daysBetweenUTC(starts[i - 1], starts[i]); // L1, L2, ...
    rawCycles.push({ x: i, y: L }); // x = i (1..k)
  }

  const lastStart = starts[n - 1];

  // Filtrado por mediana ±TOL
  const med = median(rawCycles.map((c) => c.y));
  const filtered = rawCycles.filter((c) => c.y >= (med - TOL) && c.y <= (med + TOL));

  // Si el filtrado deja sin ciclos confiables, fallback a baseline
  if (filtered.length === 0) {
    const cycleDays = BASELINE_DAYS;

    const baseNextStart = addDaysUTC(lastStart, cycleDays);
    const { today, future } = adjustToFuture(baseNextStart, cycleDays);

    return {
      ok: true,
      method: 'baseline_median_filtered',
      cyclesUsed: 0,
      predictedCycleLengthDays: cycleDays,

      nextPeriodStart: baseNextStart.toISOString(),
      adjustedNextPeriodStart: future.toISOString(),
      daysRemaining: daysBetweenUTC(today, future),

      note: `Se aplicó baseline porque todos los ciclos quedaron fuera del rango mediana±${TOL}.`,
      medianDays: med,
      toleranceDays: TOL,
    };
  }

  // Caso B: queda 1 ciclo confiable => usar ese L
  if (filtered.length === 1) {
    const cycleDays = Math.max(1, Math.round(filtered[0].y));

    const baseNextStart = addDaysUTC(lastStart, cycleDays);
    const { today, future } = adjustToFuture(baseNextStart, cycleDays);

    return {
      ok: true,
      method: 'single_cycle_median',
      cyclesUsed: 1,
      predictedCycleLengthDays: cycleDays,

      nextPeriodStart: baseNextStart.toISOString(),
      adjustedNextPeriodStart: future.toISOString(),
      daysRemaining: daysBetweenUTC(today, future),

      medianDays: med,
      toleranceDays: TOL,
    };
  }

  // Caso C: quedan 2 ciclos confiables => promedio
  if (filtered.length === 2) {
    const Lsig = (filtered[0].y + filtered[1].y) / 2;
    const cycleDays = Math.max(1, Math.round(Lsig));

    const baseNextStart = addDaysUTC(lastStart, cycleDays);
    const { today, future } = adjustToFuture(baseNextStart, cycleDays);

    return {
      ok: true,
      method: 'mean_2_median',
      cyclesUsed: 2,
      predictedCycleLengthDays: cycleDays,

      nextPeriodStart: baseNextStart.toISOString(),
      adjustedNextPeriodStart: future.toISOString(),
      daysRemaining: daysBetweenUTC(today, future),

      medianDays: med,
      toleranceDays: TOL,
    };
  }

  // Caso D: >=3 ciclos confiables => regresión lineal
  const xs = filtered.map((c) => c.x);
  const ys = filtered.map((c) => c.y);
  const model = linearRegression(xs, ys);

  // Predicción para el siguiente ciclo después del último x existente
  const lastX = xs[xs.length - 1];
  const Lsig = model ? (model.a + model.b * (lastX + 1)) : BASELINE_DAYS;

  const cycleDays = Math.max(1, Math.round(Lsig));
  const baseNextStart = addDaysUTC(lastStart, cycleDays);
  const { today, future } = adjustToFuture(baseNextStart, cycleDays);

  return {
    ok: true,
    debugVersion: 'PRED-NEW-ADJUST',
    method: 'linear_regression_median',
    cyclesUsed: filtered.length,
    predictedCycleLengthDays: cycleDays,

    nextPeriodStart: baseNextStart.toISOString(),
    adjustedNextPeriodStart: future.toISOString(),
    daysRemaining: daysBetweenUTC(today, future),

    medianDays: med,
    toleranceDays: TOL,
  };
}

// ✅ GET /api/prediccion
router.get('/', auth, async (req, res) => {
  try {
    const periodos = await prisma.periodo.findMany({
      where: { usuariaId: req.user.id },
      orderBy: { fechaInicio: 'asc' },
      select: { fechaInicio: true },
    });

    const startDates = periodos.map((p) => new Date(p.fechaInicio));

    const result = predecirProximoInicio(startDates);


    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) {
    console.error('Predicción error:', e);
    return res.status(500).json({ error: 'No se pudo calcular la predicción' });
  }
});


export default router;
