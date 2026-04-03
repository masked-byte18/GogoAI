const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    bot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bot',
        default: null,
        index: true
    },
    chat:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"chat"
    },
    content:{
        type:String,
        required: true
    },
    role:
    {
        type:String,
        enum:["user","model","system"],
        default:"user"

    },
    memoryEnabledSnapshot: {
        type: Boolean,
        default: true,
        index: true
    }
},{
    timestamps:true
})

const messageModel = mongoose.model("message",messageSchema);
module.exports = messageModel;