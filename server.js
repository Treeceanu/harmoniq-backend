// server.js

import express from 'express';
import mongoose from 'mongoose';
import Cards from './dbCards.js';
import Cors from 'cors';
import { getSpotifyToken } from './spotifyAuth.js'; // Import a function to handle Spotify authentication

// app config
const app = express();
const port = process.env.PORT || 8001;
const connection_url = 'mongodb+srv://admin:UmJgpbGL9Vth6SWX@cluster0.qeswayn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// middlewares
app.use(express.json());  // Middleware to parse JSON bodies
app.use(Cors({
     
    methods: ['GET', 'POST'], // Allow these HTTP methods
    allowedHeaders: ['Content-Type'], // Allow these headers
  }));

// DB config
mongoose.connect(connection_url)
.then(() => console.log('MongoDB connected'))
.catch((error) => console.error('MongoDB connection error:', error));

// API endpoints
app.get('/', (req, res) => res.status(200).send('turbez'));

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
  try {
    const data = await Cards.find();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Spotify OAuth callback endpoint
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code found in the request');
  }

  try {
    const token = await getSpotifyToken(code);
    // You can store the token in your database or session
    res.status(200).send(`Access token: ${token}`);
  } catch (err) {
    res.status(500).send(`Error retrieving access token: ${err}`);
  }
});

// listener
app.listen(port, () => console.log(`Listening on localhost:${port}`));
