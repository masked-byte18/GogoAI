const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const botRoutes = require('./routes/bot.routes');
const cors = require('cors');
const path = require('path');

const app = express();

/*Using middlewares */
app.use(cors({
    origin:'http://localhost:5173',
    credentials:true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'../public')));


/* Using routes */
app.use('/api/auth',authRoutes)
app.use('/api/chat',chatRoutes)
app.use('/api/bots',botRoutes)

app.get("*name",(req,res)=>
{
    res.sendFile(path.join(__dirname,'../public/index.html'));
})

module.exports = app;