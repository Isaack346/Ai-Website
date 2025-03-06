const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User'); // Correct path to models/user
const path = require('path');

const app = express();

// Middleware to parse JSON data sent from the frontend
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the public directory

// Connect to MongoDB (update with your actual MongoDB URI)
mongoose.connect('mongodb://localhost:27017/your-db-name', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);  // Exit process if unable to connect to MongoDB
    });

// Root route for serving HTML page (index.html or other)
app.get('/', (req, res) => {
    console.log("Root route hit");  // Log to check if route is being hit
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve index.html from the public folder
});

// POST route for sign up
app.post('/signup', (req, res) => {
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
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    User.findOne({ email, password })
        .then(user => {
            if (user) {
                res.json({ success: true, message: 'Login successful' });
            } else {
                res.json({ success: false, message: 'Invalid credentials' });
            }
        })
        .catch(err => {
            res.json({ success: false, message: 'Login failed', error: err });
        });
});

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
