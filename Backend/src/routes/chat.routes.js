const express = require('express')
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const chatController = require("../controllers/chat.controller")

/* POST /api/chat/guest-response */
router.post('/guest-response', chatController.generateGuestResponse)

/* POST /api/chat/guest-response/cancel */
router.post('/guest-response/cancel', chatController.cancelGuestResponse)

/* POST /api/chat/ */
router.post('/',authMiddleware.authUser, chatController.createChat)

/* GET /api/chat/ */
router.get('/',authMiddleware.authUser,chatController.getChats); 

/* GET /api/chat/:id */
router.get('/messages/:id', authMiddleware.authUser,chatController.getMessages)

/* PATCH /api/chat/:id/title */
router.patch('/:id/title', authMiddleware.authUser, chatController.updateChatTitle)

/* DELETE /api/chat/:id */
router.delete('/:id', authMiddleware.authUser, chatController.deleteChat)

module.exports = router;