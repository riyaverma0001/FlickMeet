const utils = require('../utils/generateToken.js');
const User = require('../models/user.model.js');
const bcryptjs = require('bcryptjs');
const nodemailer = require("nodemailer");
const OTP = require("../models/otp.js")

async function signup(req, res) {
  // asyn bnaya h pr jayada kuch ni h Normal Fuction h jo req or res lega
  // res.send(" Signup route");
  try {
    //  yha pr user apni credential dale ga jese username password ya email ese hi kuch

    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res
        .status(400)
        .json({ success: false, message: "All Fields Are Required" });
    }
    // abc as email bheja to  pr hme  to email proper chahiye
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid Email" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 character ",
      });
    }

    // if username and email already exit we need to check for it
    const existingUserByEmail = await User.findOne({ email: email });
    if (existingUserByEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    const existingUserByUsername = await User.findOne({ username: username });

    if (existingUserByUsername) {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    //  123456 => $_312312_smak12  kuch is trike se passwaord ko change kr dega

   
    const newUser = new User({
      // email: email,
      // password:password,
      // username:username,
      // image:image

      // is ↑ pure ki jgh hm js ki trick use kr sakte h kuki email: email h password:password h to dekho niche kse js ki trick use ki h
      email,
      password: hashedPassword,
      username,
      status: false
  
    });
    // utils.generateTokenAndSetCookie(newUser._id, res);
    await newUser.save();

    const otp = Math.floor(100000 +Math.random() * 900000).toString();
    req.session.userId = newUser._id;
const transporter = nodemailer.createTransport({
 service: 'gmail',
  auth: {
    user: "riyahaha2001@gmail.com",
    pass: "zhyx kshq mcsp idbf",
  },
});

  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: 'riyahaha2001@gmail.com', // sender address
    to: newUser.email, // list of receivers
    subject: `Your OTP is ${otp}`, // Subject line
  
    html: `${otp}`, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>



  
        const otpdata=OTP.create({
          otp, userId: newUser._id
        })
    //  res.send({ message:"signup sycessful", redirectUrl: "./login.html" })

    //  Remove password from the responce
    // res.status(201).json({
    //   success: true,
    //   user: {
    //     ...newUser._doc,
    //     password: "",
    //   },
    // });
    res.redirect('/otp-verify')
  } catch (error) {
    console.log("Error in signup controller ", error.message);

    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

//  Login Rout

// async function login(req, res) {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res
//         .status(400)
//         .json({ success: false, message: "All fields are required" });
//     }

//     const user = await User.findOne({ email: email });
//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Invalid credentials" });
//     }

//     const isPasswordCorrect = await bcryptjs.compare(password, user.password);

//     if (!isPasswordCorrect) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid credentials" });
//     }

//     //   generateTokenAndSetCookie(user._id, res);

//     //   res.status(200).json({
//     //     success: true,
//     //     user: {
//     //       ...user._doc,
//     //       password: "",
//     //     },
//     //   });

//     // }
//     generateTokenAndSetCookie(newUser._id, res);
//     await newUser.save();

//     res.status(201).json({
//       success: true,
//       user: {
//         ...newUser._doc,
//         password: "",
//       },
//     });
//   } catch (error) {
//     console.log("Error in login controller", error.message);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// }

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcryptjs.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    if(!user.status) {
      return res.status(400).json({ success: false, message: "Your account is not active"});
    }

    req.session.user = user;
    console.log(req.session.user);

    // utils.generateTokenAndSetCookie(user._id, res);

    // res.status(200).json({
    //   success: true,
      
    //   user: {
    //     ...user._doc,
    //     password: "",
    //   },
    // });
    res.redirect('/action')
  
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

//  Logout rout
async function logout(req, res) {
  // res.send("Logout route")
  // 1. Remove the cookie
  // 2. Remove the token from the database
  // 3. Remove the token from the user's document in the database
  try {

    res.clearCookie("jwt-flickmeet");
    res.status(200).json({ success: true, message: " Logout Sucessfully " });

  } catch (error) {
    console.log("error in logout controller ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function authCheck(req, res) {
  try {
    console.log("req.user:", req.user);
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    console.log("Error in authCheck controller", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {signup, login, logout, authCheck}