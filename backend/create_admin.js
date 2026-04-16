const mongoose = require('mongoose');
const User = require('./models/User'); 
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/herbascan');
    
    const existing = await User.findOne({ email: 'admin@herbalheal.com' });
    if (existing) {
      console.log("Admin user already exists.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      email: 'admin@herbalheal.com',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    console.log("Admin user created successfully: admin@herbalheal.com / admin123");
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
