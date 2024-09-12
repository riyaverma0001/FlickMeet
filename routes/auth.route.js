const express = require('express');
const AuthController = require('../controllers/auth.controller.js');
const middleware = require('../middleware/protectRoute.js');

const router = express.Router();

router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);

router.get("/authCheck", middleware.protectRoute, AuthController.authCheck);
module.exports = router;