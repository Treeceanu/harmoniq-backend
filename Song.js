// models/Song.js
import mongoose from 'mongoose';

const songSchema = new mongoose.Schema({
  name: String,
  imgUrl: String,
  previewUrl: String,
  artist: String,
  genre: String // Add this field for genre
});

const Song = mongoose.model('Song', songSchema);

export default Song;
