const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

router.get('/products', shopController.index);
router.get('/filters', shopController.filters);
router.get('/products/:slug', shopController.show);
router.get('/vehicle-models/:makeId', shopController.vehicleModelsByMake);
router.get('/track-order', shopController.trackOrder);

// Individual filter endpoints
router.get('/makes', shopController.makes);
router.get('/models', shopController.models);
router.get('/years', shopController.years);
router.get('/displacements', shopController.displacements);
router.get('/categories', shopController.categories);

// Articles public endpoints
router.get('/articles', shopController.articles);
router.get('/articles/:slug', shopController.articleBySlug);

// Add contact here in case frontend hits /shop/contact
const contactController = require('../controllers/contactController');
router.post('/contact', contactController.send);

module.exports = router;
