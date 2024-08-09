import express from "express";
import mongoose from "mongoose";
import Cards from "./dbCards.js";
import Cors from "cors";
import User from "./user.js";
import session from "express-session";
import { getSpotifyToken, getUserProfile } from "./spotifyAuth.js";

const client_id = "bf79ea0130344f8192ac87a10a888f0d";
const redirect_uri = "http://localhost:8001/callback";

const app = express();
const port = process.env.PORT || 8001;
const connection_url =
  "mongodb+srv://admin:UmJgpbGL9Vth6SWX@cluster0.qeswayn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

app.use(express.json());
app.use(
  Cors({
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(
  session({
    secret: "your_secret_key", // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Use true if using HTTPS
  })
);

mongoose
  .connect(connection_url)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.error("MongoDB connection error:", error));

app.get("/", (req, res) => res.status(200).send("turbez"));

app.post("/harmoniq/cards", async (req, res) => {
  const dbCards = req.body;
  try {
    const data = await Cards.create(dbCards);
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/harmoniq/cards", async (req, res) => {
  try {
    const data = await Cards.find();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = new User({ username, email, password });
    
    await user.save();
    res.status(201).send("User created succesfuly");
  } catch (err) {
    res.status(500).send(`Error creating user: ${err.message}`);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("User not found");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).send("Invalid credentials");
    }

    req.session.userId = user._id;
    res.status(200).send("Login succesful");
  } catch (err) {
    res.status(500).send(`Error logging in: ${err.message}`);
  }
});

app.get("/login", (req, res) => {
  const scopes = "user-read-private user-read-email";
  const auth_url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
    scopes
  )}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  res.redirect(auth_url);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No code found in the request");
  }

  try {
    const token = await getSpotifyToken(code);
    req.session.accessToken = token;
    console.log("Access token stored in session:", req.session.accessToken); // Debug log
    res.status(200).send(`Access token: ${token}`);
  } catch (err) {
    res.status(500).send(`Error retrieving access token: ${err.message}`);
  }
});

app.get("/profile", async (req, res) => {
  const accessToken = req.session.accessToken;
  if (!accessToken) {
    console.error("Access token is missing in session"); // Debug log
    return res.status(400).send("Access token is missing");
  }

  try {
    const profile = await getUserProfile(accessToken);
    res.status(200).send(profile);
  } catch (err) {
    res.status(500).send(`Error retrieving user profile: ${err.message}`);
  }
});

app.listen(port, () => console.log(`Listening on localhost:${port}`));
