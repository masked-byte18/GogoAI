const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: {
        type:String,
        required: true,
        unique: true,
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    googleId: {
        type: String,
        default: ''
    },
    fullName: {
        firstName:{
            type: String,
            required: true
        },
        lastName:{
            type: String,
            required: true
        }
    },
    password:{
        type: String,
        required: function requiredPassword() {
            return this.authProvider !== 'google';
        },
        default: ''
    },
    privateGemsPasswordHash: {
        type: String,
        default: ''
    },
    privateGemsRecoveryAnswerHash: {
        type: String,
        default: ''
    }
},{
    timestamps: true,
})



const userModel = mongoose.model("User",userSchema)

module.exports = userModel;