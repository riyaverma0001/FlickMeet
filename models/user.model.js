const mongoose = require('mongoose')

// This is user schema ↓
const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  status: {
    type: Boolean,
    required: true,
  },
});

 const User = mongoose.model("User", userSchema);
//  User Likah TO users aa jaye ga
//  animal likha to animals bn jaye ga
module.exports = User