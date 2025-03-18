const express = require('express');
const router = express.Router();
const User = require('../models/User');  // Correct path to User model

// POST route for sign up
router.post('/signup', (req, res) => {
    const { email, password } = req.body;
    
    const newUser = new User({ email, password });
    newUser.save()
        .then(() => {
            res.json({ success: true, message: 'Account created' });
        })
        .catch(err => {
            res.json({ success: false, message: 'Sign up failed', error: err });
        });
});

// POST route for login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    User.findOne({ email })
        .then(async (user) => {
            if (user) {
                // Compare entered password with hashed password
                const isMatch = await user.comparePassword(password);

                if (isMatch) {
                    res.json({ success: true, message: 'Login successful' });
                } else {
                    res.json({ success: false, message: 'Invalid credentials' });
                }
            } else {
                res.json({ success: false, message: 'Invalid credentials' });
            }
        })
        .catch(err => {
            res.json({ success: false, message: 'Login failed', error: err });
        });
});

module.exports = router;
