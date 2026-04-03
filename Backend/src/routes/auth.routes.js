const express = require('express');
const router = express.Router();
const authControllers = require("../controllers/auth.controller");


router.post('/register/check-email', authControllers.checkRegistrationEmail);

router.post('/register',authControllers.registerUser)

router.post('/login/request-otp', authControllers.requestLoginOtp);
router.post('/login/verify-otp', authControllers.verifyLoginOtp);
router.post('/login',authControllers.loginUser);

router.post('/logout',authControllers.logoutUser);

module.exports = router;