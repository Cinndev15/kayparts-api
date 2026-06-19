const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

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

    // Mock Mail send - log to console / application log (matching original MAIL_MAILER=log)
    console.log('--------------------------------------------------');
    console.log(`Reset Password Email Sent to: ${email}`);
    console.log(`Reset Token: ${token}`);
    console.log(`Link: ${process.env.FRONTEND_URL || 'https://app.kayparts.co'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`);
    console.log('--------------------------------------------------');

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
