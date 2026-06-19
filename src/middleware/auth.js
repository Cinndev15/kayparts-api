const crypto = require('crypto');
const { PersonalAccessToken, User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    const bearerToken = authHeader.substring(7); // Remove 'Bearer '
    const parts = bearerToken.split('|');

    if (parts.length !== 2) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    const [tokenId, plainTextToken] = parts;
    
    // Hash the plain text token using SHA-256
    const hashedToken = crypto.createHash('sha256').update(plainTextToken).digest('hex');

    // Find the token in database
    const tokenRecord = await PersonalAccessToken.findOne({
      where: {
        id: tokenId,
        token: hashedToken,
        tokenable_type: 'App\\Models\\User',
      },
    });

    if (!tokenRecord) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    // Load the user
    const user = await User.findByPk(tokenRecord.tokenable_id);
    if (!user) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    // Mimic Sanctum: update last_used_at
    tokenRecord.last_used_at = new Date();
    await tokenRecord.save();

    // Attach to request object
    req.user = user;
    req.tokenRecord = tokenRecord;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = authMiddleware;
