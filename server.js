require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');

const User = require('./Users');
const Movie = require('./Movies');
require('./auth_jwt'); // Load Passport strategy

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

// Connect to MongoDB
mongoose.connect(process.env.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const requireAuth = passport.authenticate('jwt', { session: false });

/* ======== USER ROUTES ======== */

// Signup
router.post('/signup', async (req, res) => {
    const { name, username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username already exists" });
        }

        const newUser = new User({ name, username, password });
        await newUser.save();
        res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Signin
router.post('/signin', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username }).select("name username password");
        if (!user) return res.status(401).json({ success: false, message: "User not found" });

        const isMatch = await user.comparePassword(req.body.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password" });

        const userToken = { id: user._id, username: user.username };
        const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: "1h" });
        res.json({ success: true, token: token });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ======== MOVIE ROUTES ======== */

// GET all movies
router.get('/movies', requireAuth, async (req, res) => {
    try {
        const movies = await Movie.find();
        res.status(200).json(movies);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single movie by title
router.get('/movies/:title', requireAuth, async (req, res) => {
    try {
        const movie = await Movie.findOne({ title: req.params.title });
        if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });
        res.json(movie);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST create new movie
router.post('/movies', requireAuth, async (req, res) => {
    try {
        const newMovie = new Movie(req.body);
        await newMovie.save();
        res.status(201).json({ success: true, message: "Movie added successfully" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT update movie by title
router.put('/movies/:title', requireAuth, async (req, res) => {
    try {
        const updated = await Movie.findOneAndUpdate({ title: req.params.title }, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Movie not found" });
        res.json({ success: true, message: "Movie updated", movie: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE movie by title
router.delete('/movies/:title', requireAuth, async (req, res) => {
    try {
        const deleted = await Movie.findOneAndDelete({ title: req.params.title });
        if (!deleted) return res.status(404).json({ success: false, message: "Movie not found" });
        res.json({ success: true, message: "Movie deleted" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Default Route
router.get('/', (req, res) => {
    res.json({ success: true, message: "Welcome to the Movie API" });
});

app.use('/', router);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;