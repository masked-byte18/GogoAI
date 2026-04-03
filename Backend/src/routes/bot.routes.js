const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require("../middlewares/auth.middleware");
const botController = require("../controllers/bot.controller"); 

const upload = multer({ storage: multer.memoryStorage() });
const botUpload = upload.fields([
	{ name: 'avatar', maxCount: 1 },
	{ name: 'knowledgeFiles', maxCount: 20 }
]);

router.post('/', authMiddleware.authUser, botUpload, botController.createBot);
router.post('/preview-response', authMiddleware.authUser, botController.previewBotResponse);
router.get('/private-access/settings', authMiddleware.authUser, botController.getPrivateAccessSettings);
router.post('/private-access/setup', authMiddleware.authUser, botController.setupPrivateAccess);
router.post('/private-access/verify', authMiddleware.authUser, botController.verifyPrivateAccess);
router.patch('/private-access/password', authMiddleware.authUser, botController.updatePrivateAccessPassword);
router.get('/avatar-backgrounds', authMiddleware.authUser, botController.getAvatarPalette);
router.get('/mine', authMiddleware.authUser, botController.getMyBots);
router.get('/public', authMiddleware.authUser, botController.getPublicBots);
router.get('/:id', authMiddleware.authUser, botController.getBotById);
router.post('/:id/access', authMiddleware.authUser, botController.verifyPrivateBotAccess);
router.patch('/:id', authMiddleware.authUser, botUpload, botController.updateBot);
router.delete('/:id', authMiddleware.authUser, botController.deleteBot);

module.exports = router;