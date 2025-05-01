// This Express route calls the OpenWeatherMap API when the chatbot needs weather data. 
// It first checks if coordinates or a city are available. Then it builds the right API URL, sends the request, 
// and returns clean, readable info to my frontend — just the city, temperature, and weather condition.
//Allows our  website fetch live weather data from OpenWeatherMap based on either the user’s city or coordinates.
// we used 
const express = require('express');
const router = express.Router();
// the fetch is used to make HTTP requests which calls the weather Api 
const fetch = require('node-fetch');

router.get('/get-weather', async (req, res) => {
  try {
    // Gets Apy Key from env
    const apiKey = process.env.WEATHER_API_KEY;
    console.log("🔑 WEATHER_API_KEY being used:", apiKey);

    const { lat, lon, city } = req.query;
    let url;
    // Checks if valid coordinates were passed.
    const validCoords = lat && lon && !isNaN(lat) && !isNaN(lon);
    //  finds Coordinates , city name if it doesn't work have a fallback which is Newark
    if (validCoords) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    } else if (city) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`;
    } else {
      const fallbackCity = "Newark";
      url = `https://api.openweathermap.org/data/2.5/weather?q=${fallbackCity}&appid=${apiKey}&units=imperial`;
    }
    // Sends a request to OpenWeatherMap and waits for the weather response.
    const response = await fetch(url);
    const data = await response.json();

    console.log("🌦️ Weather API raw response:", data);

    if (!data || !data.name || !data.weather || !data.weather[0] || !data.main) {
      console.error("❌ Incomplete weather data:", data);
      return res.status(500).json({ error: "Incomplete weather data", raw: data });
    }
    // sends city name , description and temp in Fahrenheit
    res.json({
      city: data.name,
      description: data.weather[0].description,
      temperature: data.main.temp
    });

  } catch (err) {
    console.error("❌ Weather fetch error:", err);
    res.status(500).json({ error: "Weather data unavailable" });
  }
});

module.exports = router;