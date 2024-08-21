// Example schema for SongDislikeModel
import mongoose from 'mongoose';

const SongDislikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  songId: { type: String, required: true },
});

const SongDislikeModel = mongoose.model('SongDislike', SongDislikeSchema);
export default SongDislikeModel;