require('dotenv').config();
const express = require("express");
const path = require("path")
const cookieParser = require('cookie-parser');
var session = require('express-session')
const authRoutes = require('./routes/auth.route.js');
const connectDB = require('./config/db.js');
var app = express();
port=3000;
const Otp = require('./models/otp.js')
const User = require('./models/user.model.js');
const { default: mongoose } = require('mongoose');
const cors = require('cors');
// const multer = require("multer")

connectDB();

app.use(express.json()); // will allow us to parse req.body
app.use(cookieParser());
app.use(express.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname,"")))
app.set('trust proxy', 1)
app.use(session({
    secret: 'keyboard cat',
   // cookie: { secure: true }
  }))
app.set('view engine', 'ejs');
// app.get("/",(req, res) =>{
//     res.send(" You Are At Home Page \n Try Another diffrent rout  ")
// })


app.use("/api/v1/auth", authRoutes);
// app.get('/', function(req,res) {
//     res.render('action');
// })
app.get('/signup', function(req,res) {
    res.render('signup');
})
app.get('/login', function(req,res) {
    res.render('login');
})
app.get('/action', function(req,res) {
    console.log(req.session.user);
    res.render('home', {user: req.session.user});
})

app.get('/logout', function(req,res) {
    req.session.destroy(function(err) {
        if(err) {
            console.log(err);
            
        }
        return res.redirect('action')
        
    })
})



app.get('/otp-verify',(req, res)=> {
    console.log(req.session);
    res.render('verifyOtp');
});

app.post('/otp-verify', async (req, res)=>{
    const {otp} = req.body;
    const userId = req.session.userId;
    console.log("OTP ", otp);
    const dbOtp =  await Otp.findOne({
        otp: otp,
        userId: userId
    })

    console.log("User OTP", dbOtp);

    if(!dbOtp) {
        return res.json({message: "Invalid OTP"});
    }

    const user = await User.findOne({
        _id: userId
    });
    console.log(user)
    await Otp.deleteOne({_id: dbOtp._id});
    await User.updateOne({_id: user._id}, {status: true});
    console.log("User updated successfully")
        res.redirect('/login')
})

// verify otp: otp, user id opt query where user or otp if otp otp delete user.starus = 1 other invalid otp
// 1.get user id and otp
// fetch otp from database
// if otp exists, change user status
// otherwise invalid otp

var server = app.listen(port , ()=> {
    console.log(`server started at http://localhost:${port}/action`);  
})

const fs = require("fs");
const fileUpload = require("express-fileupload");
const io = require("socket.io")(server, {
    transports: ['polling', 'websocket']
})

var userConnections = [];

io.on("connection",(socket) => {
    console.log("socket id is ", socket.id);
    socket.on("userconnect",(data)=>{
        console.log('userconnect', data.displayName, data.meetingid);
        
        var other_users = userConnections.filter(
            (p) => p.meeting_id == data.meetingid
        )

        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid
        })

        var userCount = userConnections.length;
        console.log("number of users: ",userCount);
        

        other_users.forEach((v) => {    //to => send info to specific id
            socket.to(v.connectionId).emit("inform_others_about_me", {
                other_user_id: data.displayName,
                connId: socket.id,
                userNumber: userCount
            })  
        })

        socket.emit("inform_me_about_other_users", other_users);

    })
    socket.on("SDPProcess", (data)=> {
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id,
        })
    })

    socket.on("sendMessage", (msg)=> {
        console.log(msg);
        var mUser = [];
        mUser = userConnections.find((p)=> p.connectionId == socket.id);
        if(mUser) {
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v)=> {
                socket.to(v.connectionId).emit("showChatMessage", {
                    from: from,
                    message:msg
                })
            })
        }
    })

    socket.on("fileTransferToOther", (msg)=> {
        console.log(msg);
        var mUser = [];
        mUser = userConnections.find((p)=> p.connectionId == socket.id);
        if(mUser) {
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v)=> {
                socket.to(v.connectionId).emit("showFileMessage", {
                    username:msg.username,
                    meetingid: msg.meetingid,
                    filePath: msg.filePath,
                    fileName: msg.fileName
                })
            })
        }
    })

    socket.on("disconnect", function() {
        console.log('user disconnected', socket.id);
        var disUser =[];
        disUser = userConnections.find((p) => p.connectionId == socket.id)

        if(disUser) {
            var meetingid = disUser.meeting_id;
            // var userConnections = [];
            userConnections = userConnections.filter((p) => p.connectionId != socket.id)
            var list = userConnections.filter((p) => p.meeting_id == meetingid)
            list.forEach((v)=> {
                var userNumberAfUserLeave = userConnections.length;
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
                    connId: socket.id,
                    uNumber: userNumberAfUserLeave
                })
            })
        }
    })
});
app.use(cors());
app.use(fileUpload());
// const upload = multer({ dest: 'uploads/' });

app.post("/attachimg", (req, res)=> {
    var data = req.body;
    var imagefile = req.files.file;
    console.log('File:', req.file);
    console.log('Body:', req.body);
    console.log(imagefile);
    var dir = "public/attachment/"+data.meeting_id+"/";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    imagefile.mv("public/attachment/"+data.meeting_id+"/"+imagefile.name, function(error){
        if (error) {
            console.log("couldn't upload the image file, error:", error);
        }else {
            console.log("Image file successfully uploaded");
        }
    })
    res.json({message: "Image file uploaded successfully"});
})