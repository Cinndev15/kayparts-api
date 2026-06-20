const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');
const transporter = require('../config/mail');

exports.sendResetLinkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(422).json({
        message: 'El correo electrónico es requerido.',
        errors: { email: ['El correo electrónico es requerido.'] }
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(422).json({
        message: 'No encontramos ningún usuario con esa dirección de correo electrónico.',
        errors: { email: ['No encontramos ningún usuario con esa dirección de correo electrónico.'] }
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Store in password_reset_tokens
    // Clean old tokens first
    await sequelize.query('DELETE FROM password_reset_tokens WHERE email = ?', {
      replacements: [email],
    });

    await sequelize.query(
      'INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, ?)',
      {
        replacements: [email, hashedToken, new Date()],
      }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://app.kayparts.co';
    const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const apiUrl = process.env.APP_URL || 'https://api.kayparts.co';
    const logoUrl = `${apiUrl}/uploads/app/kayparts.png`;

    const mailOptions = {
      from: `"Soporte Kayparts" <${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'soporte@kayparts.co'}>`,
      to: email,
      subject: 'Restablecer contraseña - Kayparts',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${logoUrl}" alt="Kayparts" style="max-height: 50px; display: inline-block; border: 0;" />
          </div>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">
            Has solicitado restablecer tu contraseña para acceder a la plataforma administrativa de Kayparts.
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Haz clic en el siguiente enlace para crear una nueva contraseña. Este enlace expira pronto:
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetLink}" style="background-color: #e21a22; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px;">
            Si el botón no funciona, copia y pega la siguiente URL en tu navegador:
          </p>
          <p style="word-break: break-all; color: #e21a22; font-size: 13px; font-family: monospace;">
            ${resetLink}
          </p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      message: 'Hemos enviado por correo electrónico el enlace para restablecer tu contraseña.'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, token, password, password_confirmation } = req.body;

    if (!email || !token || !password || !password_confirmation) {
      return res.status(422).json({ message: 'Todos los campos son obligatorios.' });
    }

    if (password !== password_confirmation) {
      return res.status(422).json({
        message: 'Las contraseñas no coinciden.',
        errors: { password: ['Las contraseñas no coinciden.'] }
      });
    }

    if (password.length < 8) {
      return res.status(422).json({
        message: 'La contraseña debe tener al menos 8 caracteres.',
        errors: { password: ['La contraseña debe tener al menos 8 caracteres.'] }
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(422).json({
        message: 'No encontramos ningún usuario con esa dirección de correo electrónico.',
        errors: { email: ['No encontramos ningún usuario con esa dirección de correo electrónico.'] }
      });
    }

    // Hash request token to compare
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Retrieve token record
    const [tokenRecords] = await sequelize.query(
      'SELECT * FROM password_reset_tokens WHERE email = ? AND token = ?',
      {
        replacements: [email, hashedToken],
      }
    );

    if (tokenRecords.length === 0) {
      return res.status(422).json({
        message: 'Este token de restablecimiento de contraseña es inválido.',
        errors: { email: ['Este token de restablecimiento de contraseña es inválido.'] }
      });
    }

    // Update user password
    const passwordHash = await bcrypt.hash(password, 12);
    user.password = passwordHash;
    await user.save();

    // Delete token
    await sequelize.query('DELETE FROM password_reset_tokens WHERE email = ?', {
      replacements: [email],
    });

    return res.json({
      message: 'Tu contraseña ha sido restablecida exitosamente.'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
