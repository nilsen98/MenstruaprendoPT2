import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const SALT_ROUNDS = 12;

// ===== SMTP transporter (Gmail + App Password) =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // false para 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
   tls: {
    rejectUnauthorized: false,
  },
});


export function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta token' });
  try {
    const { uid } = jwt.verify(token, JWT_SECRET);
    req.user = { id: uid };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function signToken(uid) {
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, apellido, fechaNacimiento, tutorEmail } = req.body;

    if (!email || !password || !nombre || !apellido || !fechaNacimiento)
      return res.status(400).json({ error: 'Campos requeridos: email, password, nombre, apellido, fechaNacimiento' });

    if (password.length < 8) return res.status(400).json({ error: 'Password >= 8' });

    const userEmail = String(email).trim().toLowerCase();
    const tutorEmailNorm = tutorEmail ? String(tutorEmail).trim().toLowerCase() : null;

    // ✅ Regla: tutor y usuaria no pueden compartir correo
    if (tutorEmailNorm && tutorEmailNorm === userEmail) {
      return res.status(400).json({ error: 'El correo del tutor no puede ser el mismo que el de la usuaria' });
    }

    const exists = await prisma.usuaria.findUnique({ where: { email: userEmail } });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });

    let tutorId = null;
    if (tutorEmailNorm) {
      const tutor = await prisma.tutor.findUnique({ where: { correo: tutorEmailNorm } });
      tutorId = tutor?.id ?? null;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.usuaria.create({
      data: {
        email: userEmail,
        passwordHash,
        nombre,
        apellido,
        fechaNacimiento: new Date(fechaNacimiento),
        tutorId,
      },
      select: { id: true, email: true, nombre: true, apellido: true, tutorId: true },
    });

    const token = signToken(user.id);
    res.status(201).json({ user, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en registro' });
  }
});


// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.usuaria.findUnique({ where: { email: (email||'').toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, apellido: user.apellido } });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Error en login' });
  }
});

// ======================================================
// POST /api/auth/forgot-password
// body: { email }
// Genera token temporal para reset (solo 15 min)
// ======================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const usuaria = await prisma.usuaria.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Siempre respondemos igual, exista o no
    if (!usuaria) {
      return res.json({
        ok: true,
        message: 'Si existe la cuenta, recibirás un correo.'
      });
    }

    // Generar token 
    const token = crypto.randomBytes(3).toString('hex').toUpperCase(); 
    const tokenHash = await bcrypt.hash(token, 8);
    const exp = new Date(Date.now() + 15 * 60 * 1000); 

    await prisma.usuaria.update({
      where: { id: usuaria.id },
      data: {
        resetToken: tokenHash,
        resetTokenExp: exp
      }
    });

    // DEV: devolvemos token para pruebas
   // Construir link para restablecer 
const base = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
const link = `${base}/reset-password?email=${encodeURIComponent(email.toLowerCase())}&token=${encodeURIComponent(token)}`;

// Enviar correo real
await transporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: email.toLowerCase(),
  subject: 'MenstruAprendo - Recuperación de contraseña',
  html: `
    <div style="font-family: Arial, sans-serif;">
      <h3>Recuperación de contraseña</h3>
      <p>Solicitaste restablecer tu contraseña. Da clic en el siguiente enlace:</p>
      <p><a href="${link}">Restablecer contraseña</a></p>
      <p>Este enlace expira en 15 minutos.</p>
    </div>
  `,
});

// Respuesta genérica
return res.json({
  ok: true,
  message: 'Si existe la cuenta, recibirás un correo.'
});

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo generar reset' });
  }
});

// ======================================================
// POST /api/auth/reset-password
// body: { email, token, newPassword }
// Cambia contraseña validando token
// ======================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword)
      return res.status(400).json({ error: 'email, token y newPassword son requeridos' });

    if (newPassword.length !== 8)
      return res.status(400).json({ error: 'La contraseña debe tener 8 caracteres' });

    const usuaria = await prisma.usuaria.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!usuaria || !usuaria.resetToken || !usuaria.resetTokenExp)
      return res.status(400).json({ error: 'Código inválido o expirado' });

    if (usuaria.resetTokenExp < new Date())
      return res.status(400).json({ error: 'Código expirado' });

    const ok = await bcrypt.compare(token, usuaria.resetToken);
    if (!ok) return res.status(400).json({ error: 'Código incorrecto' });

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.usuaria.update({
      where: { id: usuaria.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExp: null
      }
    });

    return res.json({ ok: true, message: 'Contraseña actualizada correctamente' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo resetear la contraseña' });
  }
});

export default router;
