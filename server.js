// This is a Node.js server using Express.js to handle routes and requests. 
// I’m using MongoDB to store user data and chat history, and Mongoose helps me interact with the database easily.
// Loads variables from a .env file
require('dotenv').config();
// rquired modules 
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const path = require('path');

const User = require('./models/User');
const userRoutes = require('./routes/userRoutes');
const SerpApi = require('google-search-results-nodejs');
const search = new SerpApi.GoogleSearch(process.env.SERPAPI_KEY);
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// initalize the Express app instance used  to define routes and launch the server.
const app = express();
// loads weather API routes and adds them to the.
const weatherRoutes = require('./routes/weatherRoutes');
app.use(weatherRoutes); // already correctly placed near top
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 JWT Auth Middleware 
// So here we check if the user has a JWT (JSON Web Token) sent in the request header or URL.
// if they don't skip this part
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return next();
// token present we verify using a secret key.
// If valid, the user data gets attached to the request (
// If invalid, it logs an error and continues.
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    next();
  }
};
// This tells the app to run this middleware on every request, so authenticated users are automatically recognized.
app.use(authenticateJWT); 

//  Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
  // if connect prints out MangoDB connceted
  // ese error
}).then(() => console.log('🤑 MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Session & Passport Setup
app.use(session({
  secret: 'influencers',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

//  Google OAuth2 
//checks if the app is running locally or online, and sets the correct Google redirect URL.
const isLocalhost = process.env.NODE_ENV !== 'production';
const redirectURI = isLocalhost
  ? 'http://localhost:3000/auth/callback'
  : process.env.GOOGLE_REDIRECT_URI;
// Sets up Google login using OAuth.
//  sends users to Google to log in, and Google sends them back to the redirect URL with a profile.
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: redirectURI
}, async (accessToken, refreshToken, profile, done) => {
  // here we check if the user already exists in your database.
  // If not, it creates a new user using their Google profile info.
  // Then it passes that user data along, so the app knows they’re logged in.
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));
// saves the user’s ID into the session using cookie
// So the server knows "who" is logged in without storing the whole user object.
passport.serializeUser((user, done) => done(null, user.id));
// This takes the ID from the session, looks up the full user in the database, and makes it available as
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ✅ Google OAuth Routes
// This route redirects the user to Google's login page.
// scope tells Google we want access to their name and email.
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// After  login, Google sends the user back to this route.
// If successful, the user is logged in and redirected 
app.get('/auth/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

// Getting clientId through env
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Sign in with a click of a button
// send a token from the browser to your backend.
app.post('/api/google-login', async (req, res) => {
    const { token } = req.body;
    console.log("📩 Received token:", token); // Add this
  
    if (!token) return res.status(400).json({ success: false, message: "No token received" });

  try {
    // Verifies that the token is valid and actually from Google.
    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
// check if user exists 
    const payload = ticket.getPayload();
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.create({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email
      });
    }
// If not, creates a new one using their Google profile.
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ success: true, token: jwtToken });
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

//  Chatbot Response utilizing chatgpt
app.get('/chatbot-response', async (req, res) => {
  const userQuery = req.query.query;
  const lang = req.query.lang || 'en';
  const userId = req.user?._id; // Make sure user is authenticated if this is expected

  if (!userQuery) {
    return res.status(400).json({ response: "No question provided." });
  }

  try {
    const completion = await openai.chat.completions.create({
      // right here is how we got to use chatgpt and this is the model we are using.
      model: "gpt-4-turbo",
      messages: [
        {
          // this part below tells our chatbot to respond in language user selected in the frontend 
          // through chat gpt 
          role: "system",
          content: `You are a helpful assistant. Always reply in ${lang === 'en' ? 'English' : lang}, regardless of the language the user types in.`
        },
        { role: "user", content: userQuery }
      ]
    });

    const aiResponse = completion.choices[0].message.content;

    //  Save to user's prompt history if authenticated
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          prompts: {
            question: userQuery,
            answer: aiResponse,
            timestamp: new Date()
          }
        }
      });
    }

    res.json({ response: aiResponse });

  } catch (error) {
    console.error('❌ OpenAI Error:', error);
    res.status(500).json({ response: "AI server error. Please try again." });
  }
});
app.post('/api/save-history', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { prompt, response: botResponse } = req.body;
  if (!prompt || !botResponse) {
    return res.status(400).json({ success: false, message: "Missing prompt or response" });
  }

  try {
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        prompts: {
          question: prompt,
          answer: botResponse,
          timestamp: new Date()
        }
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving history:", err);
    res.status(500).json({ success: false, message: "Failed to save prompt" });
  }
});





// ✅ SERP News Endpoint
app.get('/search-news', (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ response: "Missing query." });

  search.json({
    q: query,
    gl: "us",
    hl: "en",
    tbm: "nws"
  }, data => {
    const articles = data.news_results || [];
    const top = articles.slice(0, 3).map(article => ({
      title: article.title || "No title",
      link: article.link || "#",
      snippet: article.snippet || article.source || "No summary"
    }));

    res.json({ results: top });
  });
});

// ✅ Logout Route
app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).send("Logout failed");
    res.redirect('/');
  });
});
// ✅ Chat history route
app.get('/api/history', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await User.findById(req.user.id);
    res.json({ prompts: user.prompts || [] });
  } catch (err) {
    console.error("❌ Error fetching history:", err);
    res.status(500).json({ error: "Server error while fetching history" });
  }
});

// ✅ Root route
app.get('/', (req, res) => {
  console.log("Root route hit");
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


  
  // ✅ Add this AFTER the root route
  app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
  });

  
  // ✅ All API routes
  app.use('/api', userRoutes);


// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
