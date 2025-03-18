const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcryptjs for password hashing

// Define the user schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate emails are allowed
    },
    password: {
        type: String,
        required: true, // Password is mandatory
    }
});

// Pre-save hook to hash the password before saving it to the database
userSchema.pre('save', async function(next) {
    // If the password is not modified, skip the hashing
    if (!this.isModified('password')) return next();

    try {
        // Generate a salt with 10 rounds
        const salt = await bcrypt.genSalt(10);
        // Hash the password using the generated salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare entered password with the hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        // Compare the entered password with the stored hashed password
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (err) {
        throw new Error('Password comparison failed');
    }
};

// Create a model based on the schema and export it
module.exports = mongoose.model('User', userSchema);
