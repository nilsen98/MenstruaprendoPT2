import { Router } from 'express';
import { prisma } from './db.js';
import { auth } from './auth.js';
import nodemailer from 'nodemailer';

const router = Router();

// ================= SMTP =================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // true si 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
   tls: {
    rejectUnauthorized: false,
  },
});

// ================= Helpers =================
function mesKey(anio, mes) {
  const mm = String(mes).padStart(2, '0');
  return `${anio}-${mm}`;
}

function getMonthRangeUTC(anio, mes1a12) {
  const start = new Date(Date.UTC(anio, mes1a12 - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(anio, mes1a12, 1, 0, 0, 0)); // 1er día del mes siguiente
  return { start, end };
}

function diffDaysInclusiveUTC(startDate, endDate) {
  const s = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const e = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  return Math.floor((e - s) / (24 * 60 * 60 * 1000)) + 1;
}

function overlapDaysInMonthUTC({ periodoInicio, periodoFin, monthStart, monthEndExclusive }) {
  const monthEndInclusive = new Date(Date.UTC(
    monthEndExclusive.getUTCFullYear(),
    monthEndExclusive.getUTCMonth(),
    monthEndExclusive.getUTCDate() - 1
  ));

  const inicio = (periodoInicio > monthStart) ? periodoInicio : monthStart;

  // Si fechaFin es null, lo tratamos como fin del mes para el reporte
  const finReal = periodoFin ?? monthEndInclusive;
  const fin = (finReal < monthEndInclusive) ? finReal : monthEndInclusive;

  if (fin < inicio) return 0;
  return diffDaysInclusiveUTC(inicio, fin);
}

function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function countEnum(values) {
  const freq = {};
  for (const v of values) {
    if (!v) continue;
    freq[v] = (freq[v] || 0) + 1;
  }
  return freq; // { KEY: count }
}

function sortDist(dist) {
  return Object.entries(dist || {}).sort((a, b) => b[1] - a[1]);
}

// ---- Human labels ----
function humanFlujo(v) {
  switch (v) {
    case 'LIGERO': return 'Ligero';
    case 'MODERADO': return 'Moderado';
    case 'ABUNDANTE': return 'Abundante';
    default: return v ?? '';
  }
}

function humanAnimo(v) {
  switch (v) {
    case 'FELIZ': return 'Feliz';
    case 'TRISTE': return 'Triste';
    case 'ENOJADA': return 'Enojada';
    default: return v ?? '';
  }
}

// ---- Emojis ----
function emojiFlujo(v) {
  switch (v) {
    case 'LIGERO': return '💧';
    case 'MODERADO': return '💦';
    case 'ABUNDANTE': return '🌊';
    default: return '';
  }
}

function emojiAnimo(v) {
  switch (v) {
    case 'FELIZ': return '😊';
    case 'TRISTE': return '😢';
    case 'ENOJADA': return '😠';
    default: return '';
  }
}

// ---- Render distribution as HTML list items (with emojis) ----
function renderDistribucionList(dist, humanFn, emojiFn) {
  const entries = sortDist(dist);
  if (entries.length === 0) return '<li>—</li>';

  return entries
    .map(([k, v]) => {
      const emoji = emojiFn(k);
      const label = humanFn(k);
      const days = `${v} día${v === 1 ? '' : 's'}`;
      return `<li>${emoji} <b>${escapeHtml(label)}:</b> ${escapeHtml(days)}</li>`;
    })
    .join('');
}

// ---- Email HTML (mockup conceptual + real data) ----
function buildReporteEmailHTML({ tutorNombre, mes, resumen }) {
  const nombre = tutorNombre?.trim() ? tutorNombre.trim() : 'Tutor(a)';

  return `
  <div style="font-family: Arial, sans-serif; background:#FDE1DE; padding:24px;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background:#E77C9D; padding:18px 20px;">
        <div style="font-size:18px; font-weight:700; color:#ffffff;">MenstruAprende</div>
        <div style="font-size:14px; color:#ffffff; opacity:0.95; margin-top:4px;">
          Reporte mensual – ${escapeHtml(mes)}
        </div>
      </div>

      <!-- Body -->
      <div style="padding:20px; color:#4A4A4A;">
        <p style="margin:0 0 14px 0; font-size:14px;">
          Hola <b>${escapeHtml(nombre)}</b>,
        </p>

        <p style="margin:0 0 14px 0; font-size:14px; line-height:1.5;">
          Te compartimos el resumen mensual del registro de la usuaria a tu cargo,
          correspondiente al mes de <b>${escapeHtml(mes)}</b>.
        </p>

        <!-- Summary -->
        <div style="border: 2px solid #F2B8C6; border-radius: 14px; padding:14px; background:#fff;">
          <div style="font-weight:700; margin-bottom:10px; color:#9E4942;">Resumen del mes</div>

          <div style="font-size:14px; line-height:1.6; margin-bottom:10px;">
            🩸 Días con registro: <b>${escapeHtml(resumen?.diasRegistrados ?? '—')}</b><br/>
            📅 Duración del periodo (promedio en el mes):
<b>${escapeHtml(resumen?.duracionPromedioDias ?? '—')}</b>${resumen?.duracionPromedioDias != null ? ' días' : ''}
          </div>

          <div style="margin-top:8px;">
            <div style="font-weight:700; color:#9E4942; margin-bottom:6px;">💧 Distribución de flujo</div>
            <ul style="margin:0; padding-left:18px; font-size:14px; line-height:1.6;">
              ${renderDistribucionList(resumen?.flujoDistribucion, humanFlujo, emojiFlujo)}
            </ul>
          </div>

          <div style="margin-top:10px;">
            <div style="font-weight:700; color:#9E4942; margin-bottom:6px;">💗 Distribución de ánimo</div>
            <ul style="margin:0; padding-left:18px; font-size:14px; line-height:1.6;">
              ${renderDistribucionList(resumen?.animoDistribucion, humanAnimo, emojiAnimo)}
            </ul>
          </div>
        </div>

        <!-- Educational note -->
        <div style="margin-top:14px; padding:12px 14px; background:#FDE1DE; border-radius: 12px; border: 1px solid #D4AAA2;">
          <div style="font-weight:700; color:#9E4942; margin-bottom:6px;">Nota</div>
          <div style="font-size:13px; line-height:1.5;">
            Este reporte tiene como objetivo <b>acompañarte y brindarte información</b>
            para apoyar a la usuaria durante su proceso.
            <br/>
            Si notas cambios importantes o persistentes, considera consultar con un profesional de la salud.
          </div>
        </div>

        <!-- Footer -->
        <hr style="border:none; border-top:1px solid #eee; margin:18px 0;" />
        <p style="margin:0; font-size:12px; color:#777; line-height:1.4;">
          Este mensaje fue generado automáticamente por MenstruAprende.
          No es necesario responder este correo.
        </p>
      </div>
    </div>
  </div>
  `;
}

// ================= Routes =================

// GET /api/reportes -> lista reportes de la usuaria
router.get('/', auth, async (req, res) => {
  try {
    const reportes = await prisma.reporte.findMany({
      where: { usuariaId: req.user.id },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });
    res.json(reportes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron listar los reportes' });
  }
});

// POST /api/reportes/generar  body: { anio, mes }
router.post('/generar', auth, async (req, res) => {
  try {
    const { anio, mes } = req.body; // mes 1..12
    if (!anio || !mes) return res.status(400).json({ error: 'anio y mes requeridos' });

    // 1) Verificar tutor + correo (schema: Tutor.correo)
    const usuaria = await prisma.usuaria.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        tutorId: true,
        tutor: { select: { id: true, correo: true, nombre: true } }
      }
    });

    if (!usuaria?.tutorId || !usuaria.tutor) {
      return res.status(400).json({ error: 'La usuaria no tiene tutor asociado' });
    }
    if (!usuaria.tutor.correo) {
      return res.status(400).json({ error: 'El tutor no tiene correo registrado' });
    }

    const key = mesKey(anio, mes);
    const { start, end } = getMonthRangeUTC(anio, mes);

    // 2) Datos reales: días registrados del mes (PeriodoDia)
    const dias = await prisma.periodoDia.findMany({
      where: {
        fecha: { gte: start, lt: end },
        periodo: { usuariaId: usuaria.id }
      },
      select: { flujo: true, animo: true, fecha: true }
    });

    const diasRegistrados = dias.length;

    // 3) Datos reales: periodos traslapados en el mes (para duración promedio)
    const periodos = await prisma.periodo.findMany({
      where: {
        usuariaId: usuaria.id,
        fechaInicio: { lt: end },
        OR: [{ fechaFin: null }, { fechaFin: { gte: start } }]
      },
      select: { fechaInicio: true, fechaFin: true }
    });

 let duracionPromedioDias = null;

if (diasRegistrados > 0 && periodos.length > 0) {
  const duraciones = periodos
    .map(p => overlapDaysInMonthUTC({
      periodoInicio: p.fechaInicio,
      periodoFin: p.fechaFin,
      monthStart: start,
      monthEndExclusive: end
    }))
    .filter(d => d > 0);

  duracionPromedioDias = duraciones.length
    ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
    : null;
}

    // 4) Distribución real de flujo y ánimo
    const flujoDistribucion = countEnum(dias.map(d => d.flujo));
    const animoDistribucion = countEnum(dias.map(d => d.animo));

    const resumen = {
      diasRegistrados,
      duracionPromedioDias,
      flujoDistribucion,
      animoDistribucion
    };

    // 5) Guardar contenido (Reporte.contenido es String -> guardamos JSON string)
    const contenidoObj = {
      mes: key,
      usuaria: { id: usuaria.id, nombre: `${usuaria.nombre} ${usuaria.apellido}` },
      tutor: { id: usuaria.tutor.id, nombre: usuaria.tutor.nombre, correo: usuaria.tutor.correo },
      resumen
    };
    const contenido = JSON.stringify(contenidoObj, null, 2);

    const rep = await prisma.reporte.upsert({
      where: {
        usuariaId_tutorId_anio_mes: {
          usuariaId: usuaria.id,
          tutorId: usuaria.tutor.id,
          anio,
          mes
        }
      },
      update: {
        contenido,
        enviadoAt: null
      },
      create: {
        usuariaId: usuaria.id,
        tutorId: usuaria.tutor.id,
        anio,
        mes,
        contenido,
        enviadoAt: null
      }
    });

    // 6) Enviar correo con formato lista + emojis
    const subject = `📊 Reporte mensual – ${key} | MenstruAprende`;
    const html = buildReporteEmailHTML({
      tutorNombre: usuaria.tutor.nombre,
      mes: key,
      resumen
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: usuaria.tutor.correo,
      subject,
      html
    });

    // 7) Marcar como enviado
    const repEnviado = await prisma.reporte.update({
      where: { id: rep.id },
      data: { enviadoAt: new Date() }
    });

    res.status(201).json(repEnviado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo generar/enviar el reporte' });
  }
});

export default router;
