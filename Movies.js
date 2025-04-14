const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit the process if the connection fails (optional)
  }
};

connectDB();

// Movie schema
const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  releaseDate: {
    type: Number,
    required: true,
    min: [1900, 'Must be after 1899'],
    max: [2100, 'Must be before 2100']
  },
  genre: {
    type: String,
    required: true,
    enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Thriller', 'Western', 'Science Fiction']
  },
  actors: {
    type: [{
      actorName: String,
      characterName: String
    }],
    required: [true, 'Actors field is required']
  }
});

module.exports = mongoose.model('Movie', MovieSchema);