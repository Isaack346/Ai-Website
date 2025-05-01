//requirements ti interact with mongo db
//bycrypt has passqwords for safety
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the schema
// GoogleId: for google sign-ins
// name: allows users to tyoe name in string format
// email requied and has to be unique
// password is optional
// Overall are schema defines the structure and rules for each user stored in your MongoDB database.
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  prompts: [  // this is how where we  store a user’s chatbot history — every question, its answer, and the time it happened.
    {
      question: String,
      answer: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

// Pre-save hook to hash passwords
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

// Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error('Password comparison failed');
  }
};
// exports the model so we can use it in other files such as  server.js.
module.exports = mongoose.model('User', userSchema);
