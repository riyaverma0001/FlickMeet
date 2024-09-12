const mongoose = require('mongoose');

 const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MOngodb Connected " + conn.connection.host);
  } catch (error) {
    console.log("Error Connecting to mongobd" + error.message);
    process.exit(1); // 1 means there was erro 0 means success
  }
};


module.exports = connectDB