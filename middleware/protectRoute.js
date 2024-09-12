// import jwt from 'jsonwebtoken';
// import { User } from '../models/user.model.js';
// import { ENV_VARS } from '../config/envVars.js';

// export const protectRoute = async(req ,res, next) =>{
//     try {
//         const token = req.cookies['jwt-flixzone'];
//         if(!token){
//             return res.status(401).json({success: false,message: 'Unauthorized - No Token Provided'}); 
//         }

//         const decoded = jwt.verify(token , ENV_VARS.JWT_SECRET)

//         if(!decoded){
//             return res.status(401).json({success: false,message: 'Unauthorized - Invalid Token'});
//         }

//         const user = await User.findById(decoded.userId).select("-password");

//         if(!user){
//             return res.status(401).json({success: false,message: " User Not Found "});
//         }

//         req.user = user;
//         next()
//     } catch (error) {

//         console.log('Error in protectRoute middleware ', error.message);
//         res.status(500).json({ success: false, message: " Internal Server Error "});
        
        
//     }
// }

const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');
const config = require('../config/envVars.js');

 const protectRoute = async (req, res, next) => {
	try {
		const token = req.cookies["jwt-flickmeet"];

		if (!token) {
			return res.status(401).json({ success: false, message: "Unauthorized - No Token Provided" });
		}

		const decoded = jwt.verify(token, config.JWT_SECRET);

		if (!decoded) {
			return res.status(401).json({ success: false, message: "Unauthorized - Invalid Token" });
		}

		const user = await User.findById(decoded.userId).select("-password");

		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		req.user = user;

		next();
	} catch (error) {
		console.log("Error in protectRoute middleware: ", error.message);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

module.exports = {protectRoute}