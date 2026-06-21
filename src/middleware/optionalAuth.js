const crypto = require('crypto');
const { PersonalAccessToken, User } = require('../models');

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const bearerToken = authHeader.substring(7);
    const parts = bearerToken.split('|');

    if (parts.length !== 2) {
      return next();
    }

    const [tokenId, plainTextToken] = parts;
    const hashedToken = crypto.createHash('sha256').update(plainTextToken).digest('hex');

    const tokenRecord = await PersonalAccessToken.findOne({
      where: {
        id: tokenId,
        token: hashedToken,
        tokenable_type: 'App\\Models\\User',
      },
    });

    if (!tokenRecord) {
      return next();
    }

    const user = await User.findByPk(tokenRecord.tokenable_id);
    if (!user) {
      return next();
    }

    req.user = user;
    req.tokenRecord = tokenRecord;

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

module.exports = optionalAuthMiddleware;
