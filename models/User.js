const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Password hashing

// Define the schema
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: false, // Only needed for Google users
  },
  name: {
    type: String,
    required: false, // Optional, mostly used by Google Sign-In
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false, // Optional for Google Sign-In
  }
});

// Pre-save hook to hash passwords (if provided)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method for login comparison
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error('Password comparison failed');
  }
};

module.exports = mongoose.model('User', userSchema);
