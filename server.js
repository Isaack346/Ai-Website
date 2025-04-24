// ✅ Load environment variables
require('dotenv').config();

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

const app = express();

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
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

// ✅ Google OAuth2 Strategy
const isLocalhost = process.env.NODE_ENV !== 'production';
const redirectURI = isLocalhost
  ? 'http://localhost:3000/auth/callback'
  : process.env.GOOGLE_REDIRECT_URI;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: redirectURI
}, async (accessToken, refreshToken, profile, done) => {
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

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ✅ Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

// ✅ One Tap Login
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/google-login', async (req, res) => {
    const { token } = req.body;
    console.log("📩 Received token:", token); // Add this
  
    if (!token) return res.status(400).json({ success: false, message: "No token received" });

  try {
    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

    const payload = ticket.getPayload();
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.create({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email
      });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ success: true, token: jwtToken });
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// ✅ Chatbot Response
app.get('/chatbot-response', async (req, res) => {
  const userQuery = req.query.query;
  if (!userQuery) return res.status(400).json({ response: "No question provided." });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are a helpful AI assistant that gives advice on how people can use AI in daily life." },
        { role: "user", content: userQuery }
      ]
    });

    const aiResponse = completion.choices[0].message.content;
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('❌ OpenAI Error:', error);
    res.status(500).json({ response: "AI server error. Please try again." });
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

// ✅ Root Route
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
  

// ✅ API Routes
app.use('/api', userRoutes);

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));