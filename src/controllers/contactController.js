const nodemailer = require('nodemailer');

const contactController = {
  send: async (req, res) => {
    try {
      const { nombre, email, telefono, asunto, mensaje } = req.body;

      if (!nombre || !email || !mensaje) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });
      }

      // Configure transporter using env variables
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD
        }
      });

      // Construct a beautiful HTML template
      const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
              .header { background-color: #e31e24; padding: 30px; text-align: center; }
              .header img { max-height: 40px; }
              .header h1 { color: #ffffff; margin: 15px 0 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
              .content { padding: 40px 30px; }
              .content p { font-size: 16px; line-height: 1.6; margin-bottom: 25px; color: #555; }
              .info-box { background-color: #f9fbfd; border-left: 4px solid #e31e24; padding: 20px; border-radius: 4px; margin-bottom: 30px; }
              .info-row { margin-bottom: 12px; display: flex; flex-direction: column; }
              .info-label { font-weight: 700; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
              .info-value { font-size: 16px; color: #222; font-weight: 500; }
              .message-box { background-color: #ffffff; border: 1px solid #e1e5eb; border-radius: 8px; padding: 25px; margin-top: 10px; }
              .message-box p { margin: 0; font-size: 15px; color: #444; white-space: pre-wrap; font-style: italic; }
              .footer { background-color: #1a1a1a; color: #888; text-align: center; padding: 20px; font-size: 12px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <!-- Fallback text if logo fails to load -->
                  <h1 style="color: white; font-weight: 900; margin: 0;">KAYPARTS</h1>
                  <h1 style="margin-top: 10px; font-size: 18px; font-weight: normal;">Nuevo Mensaje de Contacto</h1>
              </div>
              <div class="content">
                  <p>Hola Equipo de Ventas, <br><br>Se ha recibido un nuevo mensaje desde el formulario de contacto de la página web.</p>
                  
                  <div class="info-box">
                      <div class="info-row">
                          <span class="info-label">Nombre del Cliente</span>
                          <span class="info-value">${nombre}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Correo Electrónico</span>
                          <span class="info-value"><a href="mailto:${email}" style="color: #e31e24; text-decoration: none;">${email}</a></span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Teléfono / WhatsApp</span>
                          <span class="info-value">${telefono || 'No especificado'}</span>
                      </div>
                      <div class="info-row" style="margin-bottom: 0;">
                          <span class="info-label">Motivo (Asunto)</span>
                          <span class="info-value" style="text-transform: capitalize;">${asunto}</span>
                      </div>
                  </div>

                  <span class="info-label">Mensaje del Cliente:</span>
                  <div class="message-box">
                      <p>"${mensaje}"</p>
                  </div>
              </div>
              <div class="footer">
                  Este es un correo automático generado desde la plataforma web de KAYPARTS.<br>
                  © ${new Date().getFullYear()} CINNDEV SAS.
              </div>
          </div>
      </body>
      </html>
      `;

      // Define email options
      const mailOptions = {
        from: `"${nombre} (Vía KAYPARTS)" <${process.env.MAIL_FROM_ADDRESS}>`,
        replyTo: email,
        to: 'ventas@kayparts.co',
        subject: `[KAYPARTS Contacto] Nuevo mensaje de ${nombre} - Asunto: ${asunto}`,
        html: htmlTemplate
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      return res.status(200).json({ success: true, message: '¡Mensaje enviado correctamente! Te contactaremos pronto.' });
    } catch (error) {
      console.error('Error enviando correo de contacto:', error);
      return res.status(500).json({ success: false, message: 'Ocurrió un error al enviar el mensaje. Intenta nuevamente más tarde.' });
    }
  }
};

module.exports = contactController;
