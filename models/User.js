const mongoose = require('mongoose');

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

// Create a model based on the schema and export it
module.exports = mongoose.model('User', userSchema);
