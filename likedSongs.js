// likedSongs.js
import mongoose from 'mongoose';

const likedSongSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  imgUrl: {
    type: String,
    required: true,
  },
  previewUrl: {
    type: String,
  },
  artist: {
    type: String,
  }
});

const LikedSong = mongoose.model('LikedSong', likedSongSchema);

export default LikedSong;
