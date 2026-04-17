const mongoose = require('mongoose');
const User = require('./models/User'); 
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/herbascan');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@herbalheal.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log(`Admin user with email ${adminEmail} already exists.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = new User({
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    console.log(`Admin user created successfully! Email: ${adminEmail}`);
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
