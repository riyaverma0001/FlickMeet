const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    otp: { type: String, required: true },
    userId: { type: mongoose.Types.ObjectId, required: true },
});

module.exports = mongoose.model('OTP', otpSchema);