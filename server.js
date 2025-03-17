const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const authJwtController = require('./auth_jwt');
const User = require('./Users');
const Movie = require('./Movies');

dotenv.config(); // Load environment variables

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

// Connect to MongoDB
mongoose.connect(process.env.DB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB connection error:", err));

const router = express.Router();

// User Signup Route
router.post('/signup', async (req, res) => {
    try {
        if (!req.body.username || !req.body.password) {
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }

        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "A user with that username already exists" });
        }

        const newUser = new User({
            name: req.body.name,
            username: req.body.username,
            password: req.body.password
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// User Signin Route
router.post('/signin', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username }).select("+password");
        if (!user || !(await user.comparePassword(req.body.password))) {
            return res.status(401).json({ success: false, message: "Invalid username or password" });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.SECRET_KEY, { expiresIn: "1h" });
        res.json({ success: true, token: "JWT " + token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create a new movie (POST /movies)
router.post('/movies', authJwtController.isAuthenticated, async (req, res) => {
    try {
        const { title, releaseDate, genre, actors } = req.body;

        if (!title || !releaseDate || !genre || !actors || actors.length < 3) {
            return res.status(400).json({ success: false, message: "All fields are required (title, releaseDate, genre, at least 3 actors)" });
        }

        const newMovie = new Movie(req.body);
        await newMovie.save();
        res.status(201).json({ success: true, message: "Movie added successfully", movie: newMovie });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Retrieve all movies (GET /movies)
router.get('/movies', authJwtController.isAuthenticated, async (req, res) => {
    try {
        const movies = await Movie.find();
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Retrieve a specific movie by title (GET /movies/:title)
router.get('/movies/:title', authJwtController.isAuthenticated, async (req, res) => {
    try {
        const movie = await Movie.findOne({ title: req.params.title });
        if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });
        res.status(200).json(movie);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update a movie by title (PUT /movies/:title)
router.put('/movies/:title', authJwtController.isAuthenticated, async (req, res) => {
    try {
        const movie = await Movie.findOneAndUpdate({ title: req.params.title }, req.body, { new: true });
        if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });
        res.status(200).json({ success: true, movie });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete a movie by title (DELETE /movies/:title)
router.delete('/movies/:title', authJwtController.isAuthenticated, async (req, res) => {
    try {
        const movie = await Movie.findOneAndDelete({ title: req.params.title });
        if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });
        res.status(200).json({ success: true, message: "Movie deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Default Route
router.get('/', (req, res) => {
    res.json({ success: true, message: "Welcome to the Movie API" });
});

app.use('/', router);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;