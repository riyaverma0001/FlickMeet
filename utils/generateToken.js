// import jwt from 'jsonwebtoken'
// import { ENV_VARS } from '../config/envVars.js'

const jwt = require('jsonwebtoken')
const config = require('../config/envVars.js')
 const generateTokenAndSetCookie = (userId , res) => {
    const token = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: "15d"}) ;

    res.cookie("jwt-flickmeet",token,{
        maxAge: 15*24*60*60*1000, // 15 days in milliSeconds
        httpOnly:true, // prevent XSS attacks cross-site scripting attacks, make it not be accessed by js
        sameSite:"strict",// CSRF attacks cross-site request forgery attacks
        secure:config.NODE_ENV !== "development"
    })
 return token;
}

module.exports = {generateTokenAndSetCookie}