const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch'); // required for weather
const User = require('../models/User');// MongoDB model for storing users.
// This allows us to define routes like /signup, /login, and /get-weather and export them later.
const router = express.Router();

// Signup
// checks if the email and password are provided.
//Then it checks if the email already exists in the database.
//If not, it hashes the password using bcrypt and creates a new user.
// After it generates a JWT token so the user can be logged in right away.
router.post('/signup', async (req, res) => {
  console.log("📥 Received signup request:", req.body); // ✅ Add this line

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password }); 
    console.log("✅ User created:", newUser); 

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ success: true, token });
  } catch (err) {
    console.error("Signup failed:", err);
    res.status(500).json({ success: false, message: "Signup error" });
  }
});


// Login
// checks  if both email and password are sent.
// bcrypt.compare() check if the entered password matches the hashed one.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Missing credentials" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login error" });
  }
});

// 🌦️ Get Weather 
// sends back city name
// weather description
// temp
router.get('/get-weather', async (req, res) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const { lat, lon } = req.query;

    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    } else {
      const city = "Newark";
      url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    }

    const response = await fetch(url);
    const data = await response.json();

    console.log("🌦 OpenWeather raw data:", data);

    if (!data.name || !data.weather || !data.main) {
      return res.status(500).json({ error: "Weather data incomplete or invalid." });
    }

    res.json({
      city: data.name,
      description: data.weather[0].description,
      temperature: data.main.temp
    });
  } catch (err) {
    console.error("Weather fetch error:", err);
    res.status(500).json({ error: "Weather data unavailable" });
  }
});
// export the route
module.exports = router;
