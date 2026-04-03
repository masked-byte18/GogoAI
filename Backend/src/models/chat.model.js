const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    bot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bot',
        default: null,
        index: true
    },
    title:{
        type: String,
        required: true
    },
    lastActivity:{
        type: Date,
        default: Date.now
    },
    aiResponseCount: {
        type: Number,
        default: 0
    }
},{
    timestamps:true
})

const chatModel = mongoose.model("chat",chatSchema)

module.exports = chatModel;