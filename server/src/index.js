import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './auth.js';
import moduloRouter from './modulo.js';
import periodoRouter from './periodo.js';
import reporteRouter from './reporte.js';
import usuariaRouter from './usuaria.js';
import prediccionRouter from './prediccion.js';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());



app.get('/', (_req, res) => res.send('Backend MenstruAprendo'));

// monta cada feature
app.use('/api/auth', authRouter);
app.use('/api/modulos', moduloRouter);
app.use('/api/periodos', periodoRouter);
app.use('/api/reportes', reporteRouter);
app.use('/api/usuarias', usuariaRouter);
app.use('/api/prediccion', prediccionRouter);

const PORT = process.env.PORT || 3000;

app.get('/reset-password', (req, res) => {
  const { email = '', token = '' } = req.query;

  res.send(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Restablecer contraseña</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Restablecer contraseña</h2>

        <form id="f">
          <input type="hidden" id="email" value="${String(email).replaceAll('"','&quot;')}" />
          <input type="hidden" id="token" value="${String(token).replaceAll('"','&quot;')}" />

          <label>Nueva contraseña (8 caracteres)</label><br/>
          <input id="p1" type="password" maxlength="8" style="width: 280px; padding: 8px; margin: 6px 0;" /><br/>

          <label>Repite nueva contraseña</label><br/>
          <input id="p2" type="password" maxlength="8" style="width: 280px; padding: 8px; margin: 6px 0;" /><br/>

          <button type="submit" style="padding: 10px 14px;">Guardar</button>
        </form>

        <p id="msg" style="margin-top: 12px;"></p>

        <script>
          const f = document.getElementById('f');
          const msg = document.getElementById('msg');

          f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const token = document.getElementById('token').value;
            const p1 = document.getElementById('p1').value;
            const p2 = document.getElementById('p2').value;

            if (p1.length !== 8 || p2.length !== 8) {
              msg.textContent = 'La contraseña debe tener 8 caracteres.';
              return;
            }
            if (p1 !== p2) {
              msg.textContent = 'Las contraseñas no coinciden.';
              return;
            }

            try {
              const r = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, newPassword: p1 })
              });
              const data = await r.json();
              if (!r.ok) {
                msg.textContent = data?.error || 'No se pudo actualizar.';
                return;
              }
              msg.textContent = '✅ Contraseña actualizada correctamente. Ya puedes iniciar sesión.';
            } catch (err) {
              msg.textContent = 'Error de red.';
            }
          });
        </script>
      </body>
    </html>
  `);
});


app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en puerto ${PORT}`));
