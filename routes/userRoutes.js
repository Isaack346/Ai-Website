const express = require('express');
const { createUser, findUserByEmail } = require('./modules/user'); // Importing functions from modules/user.js
const bcrypt = require('bcrypt');

const router = express.Router();

// POST /signup - User Sign Up
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    try {
        // Check if the user already exists
        const { success, message } = await findUserByEmail(email);
        if (success) {
            return res.status(400).json({ success: false, message: 'User already exists.' });
        }

        // Create new user
        const { success: createSuccess, message: createMessage } = await createUser(email, password);
        if (createSuccess) {
            return res.status(201).json({ success: true, message: 'Account created successfully' });
        } else {
            return res.status(500).json({ success: false, message: createMessage });
        }
    } catch (error) {
        console.error('Error during sign-up:', error);
        res.status(500).json({ success: false, message: 'Server error during sign-up' });
    }
});

module.exports = router;
