const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/auth/:provider/callback', authController.handleProviderCallback);
router.post('/forgot-password', passwordResetController.sendResetLinkEmail);
router.post('/reset-password', passwordResetController.resetPassword);

module.exports = router;
