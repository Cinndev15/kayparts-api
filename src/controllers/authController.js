const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, PersonalAccessToken } = require('../models');

// Helper to create Sanctum-compatible token
async function createSanctumToken(user, tokenName = 'auth_token') {
  const plainTextToken = crypto.randomBytes(40).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(plainTextToken).digest('hex');

  const tokenRecord = await PersonalAccessToken.create({
    tokenable_type: 'App\\Models\\User',
    tokenable_id: user.id,
    name: tokenName,
    token: hashedToken,
    abilities: '["*"]',
  });

  return `${tokenRecord.id}|${plainTextToken}`;
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({
        message: 'El email y la contraseña son requeridos.',
        errors: { email: ['El email y la contraseña son requeridos.'] }
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(422).json({
        message: 'Las credenciales proporcionadas son incorrectas.',
        errors: { email: ['Las credenciales proporcionadas son incorrectas.'] }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(422).json({
        message: 'Las credenciales proporcionadas son incorrectas.',
        errors: { email: ['Las credenciales proporcionadas son incorrectas.'] }
      });
    }

    const token = await createSanctumToken(user);

    // Return exact same structure as Laravel:
    return res.json({
      message: 'Login exitoso',
      access_token: token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(422).json({
        message: 'Datos de registro inválidos.',
        errors: {
          name: !name ? ['El nombre es requerido.'] : [],
          email: !email ? ['El email es requerido.'] : [],
          password: !password || password.length < 8 ? ['La contraseña debe tener al menos 8 caracteres.'] : []
        }
      });
    }

    // Check unique email
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(422).json({
        message: 'El correo ya está registrado.',
        errors: { email: ['El correo electrónico ya ha sido registrado.'] }
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: passwordHash,
    });

    const token = await createSanctumToken(user);

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      access_token: token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.tokenRecord) {
      await req.tokenRecord.destroy();
    }
    return res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.user = async (req, res) => {
  try {
    const user = req.user;
    const addresses = await user.getAddresses({ order: [['is_primary', 'DESC']] });
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      addresses: addresses,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.handleProviderCallback = async (req, res) => {
  try {
    const { provider } = req.params;
    const { token } = req.body;

    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Proveedor no soportado' });
    }

    if (!token) {
      return res.status(422).json({ message: 'El token es requerido.' });
    }

    let socialId, email, name;

    if (provider === 'google') {
      try {
        // Fetch google user info using bearer token or google token info endpoint
        const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const googleData = await googleRes.json();
        
        if (googleData.sub) {
          socialId = googleData.sub;
          email = googleData.email;
          name = googleData.name || 'Usuario';
        } else {
          // Try id_token verification as fallback
          const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
          const verifyData = await verifyRes.json();
          if (verifyData.sub) {
            socialId = verifyData.sub;
            email = verifyData.email;
            name = verifyData.name || 'Usuario';
          } else {
            throw new Error('Invalid Google token');
          }
        }
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado', details: err.message });
      }
    } else if (provider === 'apple') {
      // Decode JWT payload for Apple
      try {
        const parts = token.split('.');
        if (parts.length < 2) throw new Error('JWT malformed');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        socialId = payload.sub;
        email = payload.email;
        name = req.body.name || 'Usuario Apple';
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado', details: err.message });
      }
    }

    const providerField = `${provider}_id`;

    // Search for existing user
    let user = await User.findOne({
      where: {
        [providerField]: socialId
      }
    });

    if (!user && email) {
      user = await User.findOne({ where: { email } });
      if (user) {
        user[providerField] = socialId;
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        name: name,
        email: email,
        password: null,
        [providerField]: socialId,
        auth_provider: provider,
      });
    }

    const sessionToken = await createSanctumToken(user);

    return res.json({
      message: 'Login exitoso',
      access_token: sessionToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
};
