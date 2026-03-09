import { Router } from 'express';
import { prisma } from './db.js';
import { auth } from './auth.js';
import bcrypt from 'bcryptjs';

const router = Router();
const SALT_ROUNDS = 12;
// GET /api/usuarias/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.usuaria.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        fechaNacimiento: true,
        tutorId: true,
        tutor: { select: { id: true, nombre: true, correo: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'Usuaria no encontrada' });
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo obtener el perfil' });
  }
});

// PATCH /api/usuarias/me
// body opcional: { nombre, apellido, fechaNacimiento, tutor: { nombre, correo } } o tutor: null
router.patch('/me', auth, async (req, res) => {
  try {
    const { nombre, apellido, fechaNacimiento, tutor } = req.body || {};

    // 1) actualizar datos usuaria (si vienen)
    const dataUsuaria = {};
    if (nombre !== undefined) dataUsuaria.nombre = nombre;
    if (apellido !== undefined) dataUsuaria.apellido = apellido;

    if (fechaNacimiento !== undefined) {
      const fn = new Date(fechaNacimiento);
      if (isNaN(fn)) return res.status(400).json({ error: 'fechaNacimiento inválida' });
      dataUsuaria.fechaNacimiento = fn;
    }

    // 2) manejo de tutor (crear/editar/desvincular)
    // tutor puede ser: undefined (no tocar), null (desvincular), o {nombre, correo}
    if (tutor !== undefined) {
      // a) desvincular tutor
      if (tutor === null || tutor?.correo === '' || tutor?.correo === null) {
        dataUsuaria.tutorId = null;
      } else {
        const tutorNombre = (tutor?.nombre || '').trim();
        const tutorCorreo = (tutor?.correo || '').trim().toLowerCase();

// ✅ Regla: el correo del tutor NO puede ser el mismo que el de la usuaria
const usuariaActual = await prisma.usuaria.findUnique({
  where: { id: req.user.id },
  select: { email: true, tutorId: true },
});

if (!usuariaActual) {
  return res.status(404).json({ error: 'Usuaria no encontrada' });
}

if (usuariaActual.email.toLowerCase() === tutorCorreo) {
  return res.status(400).json({ error: 'El correo del tutor no puede ser el mismo que el de la usuaria' });
}


        if (!tutorNombre || !tutorCorreo) {
          return res.status(400).json({ error: 'tutor.nombre y tutor.correo son requeridos' });
        }

        // obtiene la usuaria actual para saber si ya tiene tutorId
        const actual = usuariaActual;


        // si ya tiene tutor, lo actualizamos (permitir editar cuantas veces quiera)
        if (actual?.tutorId) {
          // si intenta cambiar el correo a uno ya usado por otro tutor -> conflicto
          const existing = await prisma.tutor.findUnique({
            where: { correo: tutorCorreo },
            select: { id: true },
          });

          if (existing && existing.id !== actual.tutorId) {
            return res.status(409).json({ error: 'Ese correo ya está registrado para otro tutor' });
          }

          await prisma.tutor.update({
            where: { id: actual.tutorId },
            data: { nombre: tutorNombre, correo: tutorCorreo },
          });

          dataUsuaria.tutorId = actual.tutorId;
        } else {
          // si no tiene tutor: crear y vincular
          // si el correo ya existe, puedes:
          // - vincular al existente (si quieres permitirlo)
          // - o devolver error
          // Yo recomiendo vincular SOLO si quieres permitir tutores compartidos.
          const existing = await prisma.tutor.findUnique({
            where: { correo: tutorCorreo },
            select: { id: true },
          });

          if (existing) {
            // opción A: vincular al tutor existente
            dataUsuaria.tutorId = existing.id;
          } else {
            // crear tutor nuevo
            const nuevoTutor = await prisma.tutor.create({
              data: { nombre: tutorNombre, correo: tutorCorreo },
              select: { id: true },
            });
            dataUsuaria.tutorId = nuevoTutor.id;
          }
        }
      }
    }

    // 3) aplicar update a usuaria (si no hay cambios, devuelve perfil actual)
    const updated = await prisma.usuaria.update({
      where: { id: req.user.id },
      data: dataUsuaria,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        fechaNacimiento: true,
        tutorId: true,
        tutor: { select: { id: true, nombre: true, correo: true } },
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar el perfil' });
  }
});

// PATCH /api/usuarias/change-password
// body: { currentPassword, newPassword }
router.patch('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword y newPassword son requeridos' });
    }

    if (String(newPassword).length !== 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener 8 caracteres' });
    }

    // 1) Traer hash actual
    const user = await prisma.usuaria.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) return res.status(404).json({ error: 'Usuaria no encontrada' });

    // 2) Validar contraseña actual
    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // 3) Guardar nuevo hash
    const newHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);

    await prisma.usuaria.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    return res.json({ ok: true, message: 'Contraseña actualizada correctamente' });

  } catch (e) {
    console.error('Change password error:', e);
    return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
  }
});


export default router;