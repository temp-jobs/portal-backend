const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Avoid indefinite waits
    });

    console.log('✅ MongoDB Connected Successfully');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB Disconnected');
    });
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
