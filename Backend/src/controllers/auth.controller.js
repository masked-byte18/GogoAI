const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendLoginOtpEmail } = require('../services/mail.service');
const { validateRegistrationEmail } = require('../services/email-validation.service');

const authCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
};

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const loginOtpStore = new Map();

function createSixDigitOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function clearExpiredOtpAttempts() {
    const now = Date.now();
    for (const [attemptToken, value] of loginOtpStore.entries()) {
        if (value.expiresAt <= now) {
            loginOtpStore.delete(attemptToken);
        }
    }
}

async function registerUser(req,res){
    const {fullName:{firstName,lastName},email,password} = req.body;

    const emailValidation = await validateRegistrationEmail(email);
    if (!emailValidation.acceptable) {
        return res.status(400).json({ message: emailValidation.reason });
    }

    const normalizedEmail = emailValidation.normalizedEmail;

    const isUserAlreadyExists = await userModel.findOne({ email: normalizedEmail})

    const hashPassword = await bcrypt.hash(password, 10);

    if(isUserAlreadyExists)
    {
        return res.status(400).json({message: "User already exists"});
    }

    const user =await userModel.create({
        fullName:{
            firstName,lastName
        },email: normalizedEmail,password:hashPassword
    })

    const token = jwt.sign({ id: user._id}, process.env.JWT_SECRET)

    res.cookie("token",token, authCookieOptions)

    res.status(201).json({
        message:"User registered successfullly",
        user: {
            email: user.email,
            _id: user._id,
            fullName: user.fullName
        }
    })
}

async function loginUser(req,res){
    return requestLoginOtp(req, res);
}

async function requestLoginOtp(req,res){
    clearExpiredOtpAttempts();

    const { email,password} = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const user = await userModel.findOne({
        email: normalizedEmail
    })

    if(!user){
        return res.status(400).json({ message: "Invalid email or password"});
    }

    const isPasswordValid = await bcrypt.compare(password,user.password);

    if(!isPasswordValid)
    {
        return res.status(400).json({message: "Invalid email or password"});
    }

    const otpCode = createSixDigitOtp();
    const attemptToken = crypto.randomBytes(32).toString('hex');
    const otpHash = await bcrypt.hash(otpCode, 8);
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const allowDevOtpFallback = process.env.ALLOW_DEV_OTP_FALLBACK === 'true';
    let devOtp = '';

    loginOtpStore.set(attemptToken, {
        userId: user._id.toString(),
        email: user.email,
        otpHash,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts: 0
    });

    try {
        await sendLoginOtpEmail({
            to: user.email,
            otpCode,
            expiryMinutes: Math.floor(OTP_EXPIRY_MS / 60000)
        });
    } catch (error) {
        if (isDevelopment && allowDevOtpFallback) {
            devOtp = otpCode;
            console.warn('OTP email failed, using development fallback OTP.', error.message);
        } else {
            loginOtpStore.delete(attemptToken);
            return res.status(500).json({
                message: 'Unable to send OTP. Please configure SMTP_USER and SMTP_PASS in backend .env.'
            });
        }
    }

    return res.status(200).json({
        message: 'OTP sent to your email.',
        attemptToken,
        expiresInMs: OTP_EXPIRY_MS,
        ...(devOtp ? { devOtp } : {})
    });
}

async function verifyLoginOtp(req, res) {
    clearExpiredOtpAttempts();

    const { attemptToken, otp } = req.body;
    const otpSession = loginOtpStore.get(String(attemptToken || ''));

    if (!otpSession) {
        return res.status(400).json({ message: 'OTP session expired. Login again.' });
    }

    if (otpSession.expiresAt <= Date.now()) {
        loginOtpStore.delete(attemptToken);
        return res.status(400).json({ message: 'OTP expired. Login again.' });
    }

    const isOtpValid = await bcrypt.compare(String(otp || ''), otpSession.otpHash);
    if (!isOtpValid) {
        otpSession.attempts += 1;

        if (otpSession.attempts >= OTP_MAX_ATTEMPTS) {
            loginOtpStore.delete(attemptToken);
        } else {
            loginOtpStore.set(attemptToken, otpSession);
        }

        return res.status(400).json({ message: 'Invalid OTP.' });
    }

    loginOtpStore.delete(attemptToken);
    const user = await userModel.findById(otpSession.userId);

    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }

    const token = jwt.sign({ id: user._id}, process.env.JWT_SECRET);

    res.cookie("token",token, authCookieOptions);

    res.status(200).json({
        message:"User logged in successfully",
        user:{
            email: user.email,
            _id: user._id,
            fullName: user.fullName
        }
    })
}

async function checkRegistrationEmail(req, res) {
    const { email } = req.body;
    const validation = await validateRegistrationEmail(email);

    if (!validation.acceptable) {
        return res.status(400).json({
            message: validation.reason,
            email: validation.normalizedEmail,
            exists: false
        });
    }

    return res.status(200).json({
        message: validation.reason,
        email: validation.normalizedEmail,
        exists: true
    });
}

async function logoutUser(req, res) {
    res.clearCookie('token', authCookieOptions);
    res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    requestLoginOtp,
    verifyLoginOtp,
    checkRegistrationEmail
}