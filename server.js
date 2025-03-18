require('dotenv').config(); // Load environment variables
console.log("Loaded SECRET_KEY:", process.env.SECRET_KEY); // Debugging line

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); 
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, username, password } = req.body;

        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username already exists. Please choose another." });
        }

        const newUser = new User({ name, username, password });
        await newUser.save();
        res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Signin
router.post('/signin', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username }).select("name username password");

        if (!user) {
            return res.status(401).json({ success: false, msg: "Authentication failed. User not found." });
        }

        const isMatch = await user.comparePassword(req.body.password);
        if (isMatch) {
            const token = jwt.sign({ id: user._id, username: user.username }, process.env.SECRET_KEY, { expiresIn: "1h" });
            res.json({ success: true, token: "JWT " + token });
        } else {
            res.status(401).json({ success: false, msg: "Authentication failed. Incorrect password." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
    }
});

router.get('/movies', async (req, res) => {
    try {
        const movies = await Movie.find(); // Fetch all movies
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.use('/', router);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
