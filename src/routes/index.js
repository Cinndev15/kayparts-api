const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const shopRoutes = require('./shop');
const selectsRoutes = require('./selects');
const geoRoutes = require('./geo');
const adminRoutes = require('./admin');
const publicRoutes = require('./public');

// Mount all routes under their respective prefixes, matching Laravel
router.use('/', authRoutes);
router.use('/shop', shopRoutes);
router.use('/selects', selectsRoutes);
router.use('/geo', geoRoutes);
router.use('/', publicRoutes); // handles webhooks, checkout, workshop app
router.use('/', adminRoutes); // handles addresses, profile, and CRUD resources

module.exports = router;
