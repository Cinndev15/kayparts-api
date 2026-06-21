const crypto = require('crypto');
const { PersonalAccessToken, User } = require('./src/models');

async function createToken() {
  const user = await User.findByPk(3); // pedro@gmail.com
  const randomStr = crypto.randomBytes(40).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(randomStr).digest('hex');
  
  const tokenRecord = await PersonalAccessToken.create({
    tokenable_type: 'App\\Models\\User',
    tokenable_id: user.id,
    name: 'test_token',
    token: hashedToken,
    abilities: '["*"]'
  });
  
  console.log(`Generated Token: ${tokenRecord.id}|${randomStr}`);
  process.exit(0);
}
createToken();
