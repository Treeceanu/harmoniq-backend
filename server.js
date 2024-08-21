import express from 'express';
import mongoose from 'mongoose';
import Cors from 'cors';
import session from 'express-session';
import axios from 'axios';
import User from './user.js';
import Song from './Song.js';
import LikedSong from './likedSongs.js';
import SongDislikeModel from './dislikedSongs.js';
import { getSpotifyToken, getUserProfile } from './spotifyAuth.js';

const client_id = 'bf79ea0130344f8192ac87a10a888f0d';
const client_secret = 'd0e86bfb16544c69850fc283dc84149f';
const redirect_uri = 'http://localhost:8001/callback';

const app = express();
const port = process.env.PORT || 8001;
const connection_url = 'mongodb+srv://admin:UmJgpbGL9Vth6SWX@cluster0.qeswayn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

app.use(express.json());
app.use(Cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(session({
  secret: 'd0e86bfb16544c69850fc283dc84149f',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

mongoose.connect(connection_url, {
 
})
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

app.get('/', (req, res) => res.status(200).send('Server is running'));

// Signup endpoint
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).send('User created successfully');
  } catch (err) {
    res.status(500).send(`Error creating user: ${err.message}`);
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt with email: ${email}`);
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found with email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Log stored hash and password attempt
    console.log(`Stored Hash: ${user.password}`);
    const isPasswordMatch = await user.comparePassword(password);
    console.log(`Password Match: ${isPasswordMatch}`);
    
    if (!isPasswordMatch) {
      console.log(`Invalid password for user with email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user._id;
    console.log(`User logged in: ${email}`);
    res.status(200).json({ user });
  } catch (err) {
    console.error(`Error logging in: ${err.message}`);
    res.status(500).json({ error: `Error logging in: ${err.message}` });
  }
});
// Like song endpoint
app.post('/like-song', async (req, res) => {
  const { song } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated. Please log in.' });
  }

  try {
    const likedSong = new LikedSong({ ...song, userId });
    await likedSong.save();
    res.status(200).json({ message: 'Song liked!', likedSong });
  } catch (err) {
    console.error(`Error liking song: ${err.message}`);
    res.status(500).json({ error: `Error liking song: ${err.message}` });
  }
});

// Get liked songs endpoint
app.get('/liked-songs', async (req, res) => {
  const userId = req.session.userId;

  if (userId) {
    try {
      const likedSongs = await LikedSong.find({ userId });
      res.status(200).json(likedSongs);
    } catch (err) {
      res.status(500).json({ error: `Error fetching liked songs: ${err.message}` });
    }
  } else {
    res.status(200).json(req.session.tempLikedSongs || []);
  }
});
app.post('/disliked-songs', async (req, res) => {
  const { songId } = req.body;
  const userId = req.session.userId; // Assuming user is attached to request

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const result = await SongDislikeModel.create({ userId, songId });
    console.log('Disliked song saved:', result); // Log success
    res.status(200).json({ message: "Song disliked" });
  } catch (error) {
    console.error('Error disliking song:', error); // Detailed error logging
    res.status(500).json({ error: "Error disliking song" });
  }
});
app.get('/api/songs', async (req, res) => {
  const { genre } = req.query;
  
  try {
    const query = genre ? { genre } : {}; // Filter by genre if provided
    const songs = await Song.find(query);
    res.status(200).json(songs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).send('Server error');
  }
});


// Fetch Spotify recommendations
app.get('/harmoniq/cards', async (req, res) => {
  const accessToken = req.session.accessToken;
  const genre = req.query.genre;

  if (!accessToken) {
    return res.status(400).send('Access token is missing');
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/recommendations', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      params: {
        seed_genres: genre || 'hip-hop',
        limit: 50
      }
    });

    console.log('API Response:', response.data); // Log the response

    const songs = response.data.tracks.map(track => ({
      name: track.name,
      imgUrl: track.album.images[0]?.url, // Use optional chaining to avoid errors
      previewUrl: track.preview_url,
      artist: track.artists.map(artist => artist.name).join(', ')
    }));

    res.status(200).send(songs);
  } catch (error) {
    console.error(`Error fetching recommendations: ${error.message}`);
    res.status(500).send(`Error fetching recommendations: ${error.message}`);
  }
});
// Spotify login route
app.get('/login', (req, res) => {
  const scopes = 'user-read-private user-read-email';
  const auth_url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  res.redirect(auth_url);
});

// Spotify callback route
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code found in the request');
  }

  try {
    const token = await getSpotifyToken(code);
    req.session.accessToken = token.access_token;
    req.session.save(() => {
      console.log('Access token stored in session:', req.session.accessToken);
      res.status(200).send(`Access token: ${token.access_token}`);
    });
  } catch (err) {
    res.status(500).send(`Error retrieving access token: ${err.message}`);
  }
});

// User profile route
app.get('/profile', async (req, res) => {
  const accessToken = req.session.accessToken;
  if (!accessToken) {
    console.error('Access token is missing in session');
    return res.status(400).send('Access token is missing');
  }

  try {
    const profile = await getUserProfile(accessToken);
    res.status(200).send(profile);
  } catch (err) {
    res.status (500).send(`Error retrieving user profile: ${err.message}`);
  }
});

app.listen(port, () => console.log(`Listening on localhost:${port}`));
