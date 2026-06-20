const nodemailer = require('nodemailer');

async function testPorts() {
  const configs = [
    { name: 'Port 465 (SSL)', host: 'smtp.hostinger.com', port: 465, secure: true },
    { name: 'Port 587 (TLS)', host: 'smtp.hostinger.com', port: 587, secure: false }
  ];

  for (const config of configs) {
    console.log(`Testing ${config.name}...`);
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: 'soporte@kayparts.co',
        pass: 'Kayparts2026*'
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000
    });

    try {
      await new Promise((resolve, reject) => {
        transporter.verify((err, success) => {
          if (err) reject(err);
          else resolve(success);
        });
      });
      console.log(`✅ ${config.name} connected successfully!`);
    } catch (err) {
      console.error(`❌ ${config.name} failed:`, err.message);
    }
  }
  process.exit(0);
}

testPorts();
