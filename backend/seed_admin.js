const mongoose = require('mongoose');
const User = require('./models/User'); 
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/herbascan';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    
    const adminEmail = 'admin@herbalheal.com';
    const existing = await User.findOne({ email: adminEmail });
    
    if (existing) {
      console.log(`User ${adminEmail} already exists. Updating role to admin...`);
      existing.role = 'admin';
      await existing.save();
      console.log("Admin role updated successfully.");
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });

      await admin.save();
      console.log(`Admin user created successfully: ${adminEmail} / admin123`);
    }
    
    console.log("Seeding complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding admin:", err);
    process.exit(1);
  }
}

seedAdmin();
