const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// @route   POST /api/auth/signup
// @desc    Register a new user to the MongoDB Cluster0
router.post('/signup', authController.signup);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', authController.login);

module.exports = router;
