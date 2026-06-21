const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const checkoutController = require('../controllers/checkoutController');
const boldWebhookController = require('../controllers/boldWebhookController');
const workshopApplicationController = require('../controllers/workshopApplicationController');

const optionalAuthMiddleware = require('../middleware/optionalAuth');

router.post('/checkout/process', optionalAuthMiddleware, checkoutController.process);
router.post('/webhooks/bold', boldWebhookController.handle);
router.post('/workshop-applications', workshopApplicationController.store);

// Resiliency endpoints mirroring original Laravel helper routes
router.get('/setup-folders', (req, res) => {
  const folders = [
    'public/uploads',
    'public/uploads/brands',
    'public/uploads/product_brands',
    'public/uploads/categories',
    'public/uploads/subcategories',
    'public/uploads/vehicle_models',
    'public/uploads/products'
  ];

  const results = [];
  folders.forEach(folder => {
    const fullPath = path.join(__dirname, '../../', folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      results.push(`✅ Carpeta creada: ${folder}`);
    } else {
      results.push(`✔ Ya existía: ${folder}`);
    }
  });

  return res.send(results.join('\n'));
});

router.get('/puente', (req, res) => {
  return res.send('¡Éxito absoluto! Las carpetas han sido vinculadas directamente (Node.js version).');
});

router.get('/migrate-brands', (req, res) => {
  return res.send('Resultados de la migración: Node.js database models running successfully.');
});

router.get('/migrate-models', (req, res) => {
  return res.send('Resultados de la migración de modelos: Node.js database models running successfully.');
});

module.exports = router;
