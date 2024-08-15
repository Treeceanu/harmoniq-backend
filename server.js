import express from 'express';
import mongoose from 'mongoose';
import Cors from 'cors';
import session from 'express-session';
import axios from 'axios';
import Cards from './dbCards.js';
import User from './user.js';
import { getSpotifyToken, getUserProfile } from './spotifyAuth.js';

const client_id = 'bf79ea0130344f8192ac87a10a888f0d';
const client_secret = 'd0e86bfb16544c69850fc283dc84149f'; // Ensure you add this line
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
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

mongoose.connect(connection_url)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

app.get('/', (req, res) => res.status(200).send('Server is running'));

app.post('/harmoniq/cards', async (req, res) => {
  const dbCards = req.body;
  try {
    const data = await Cards.create(dbCards);
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/harmoniq/cards', async (req, res) => {
  const accessToken = req.session.accessToken;
  console.log('Access Token in /harmoniq/cards:', accessToken);

  if (!accessToken) {
    return res.status(400).send('Access token is missing');
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/recommendations', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      params: {
        seed_genres: 'pop',
        limit: 10
      }
    });

    const songs = response.data.tracks.map(track => ({
      name: track.name,
      imgUrl: track.album.images[0].url // Ensure this points to the correct image URL
    }));

    res.status(200).send(songs);
  } catch (error) {
    res.status(500).send(`Error fetching recommendations: ${error.message}`);
  }
});

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

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = user.password === password;
    console.log({ email, password, isMatch });

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: `Error logging in: ${err.message}` });
  }
});

app.get('/login', (req, res) => {
  const scopes = 'user-read-private user-read-email';
  const auth_url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  res.redirect(auth_url);
});

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
    res.status(500).send(`Error retrieving user profile: ${err.message}`);
  }
});

app.listen(port, () => console.log(`Listening on localhost:${port}`));
