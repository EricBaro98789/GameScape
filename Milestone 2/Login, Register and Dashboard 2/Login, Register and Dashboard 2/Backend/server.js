// server.js

// Import necessary libraries
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Using bcryptjs - easier to install
const jwt = require('jsonwebtoken');

// Create an instance of an Express application
const app = express();

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Crucial for parsing JSON request bodies for register/login/collection

// Define the port the server will run on
const port = process.env.PORT || 8080;

// --- In-memory storage (Data will be lost on server restart) ---
const users = {}; // Format: users['user@example.com'] = { username: 'name', password: 'hashedPassword' }
const collections = {}; // Format: collections['user@example.com'] = [{gameId: ..., gameTitle: ..., gameImage: ...}, ...]

// --- IMPORTANT: JWT Secret Key ---
// This key is used to sign and verify your login tokens.
// It should be a long, random, and secret string.
// **DO NOT use a weak key or your RAWG API key here.**
// For now, we'll hardcode it. For any real application or if sharing code,
// this ABSOLUTELY MUST be moved to an environment variable (e.g., in a .env file).
const JWT_SECRET = 'Eric123';
// ^^^^^^^^^^^^^^^ REPLACE THE ABOVE WITH YOUR OWN UNIQUE, STRONG SECRET!

// --- Root Route ---
app.get('/', (req, res) => {
  res.send('Hello World! Your GameScape backend server is running.');
});

// --- Route for searching games on RAWG ---
app.get('/api/games/search', async (req, res) => {
  const searchQuery = req.query.query;
  const apiKey = '49019cbf03744419a483362b07d2f0a1'; // Your hardcoded RAWG API Key

  if (!searchQuery) {
    return res.status(400).json({ message: 'Search query is required' });
  }
  if (!apiKey) {
    console.error('RAWG API Key is missing in the code.');
    return res.status(500).json({ message: 'Server configuration error: API Key is missing in code' });
  }

  const rawgUrl = `https://api.rawg.io/api/games`;
  try {
    console.log(`Searching RAWG for: ${searchQuery}`);
    const response = await axios.get(rawgUrl, {
      params: { key: apiKey, search: searchQuery, page_size: 10 }
    });
    console.log(`Successfully fetched search data from RAWG.`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching search data from RAWG API:', error.message);
    if (error.response) {
      console.error('RAWG Response Status:', error.response.status);
      console.error('RAWG Response Data:', error.response.data);
    }
    res.status(500).json({ message: 'Error fetching data from external API' });
  }
});

// --- Route for fetching details of a single game ---
app.get('/api/games/:id', async (req, res) => {
  const gameId = req.params.id;
  const apiKey = '49019cbf03744419a483362b07d2f0a1'; // <<< CORRECTED: Using your actual hardcoded RAWG API Key

  if (!apiKey) {
    console.error('RAWG API Key is missing in code for game details.');
    return res.status(500).json({ message: 'Server configuration error: API Key missing' });
  }
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }

  const rawgDetailUrl = `https://api.rawg.io/api/games/${gameId}`;
  try {
    console.log(`Workspaceing details for game ID: ${gameId} from RAWG...`); // Corrected "Workspaceing"
    const response = await axios.get(rawgDetailUrl, {
      params: { key: apiKey }
    });
    console.log(`Successfully fetched details for game ID: ${gameId}`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching details for game ID ${gameId} from RAWG API:`, error.message);
    if (error.response) {
      console.error('RAWG Response Status:', error.response.status);
      console.error('RAWG Response Data:', error.response.data);
    }
    res.status(500).json({ message: `Error fetching game details for ID ${gameId}` });
  }
});

// --- User Registration Route ---
app.post('/register', async (req, res) => { // No need for express.json() here if app.use(express.json()) is global
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    if (users[email]) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    users[email] = { username, password: hashedPassword };
    console.log('User registered:', users[email]); // For debugging
    res.status(201).json({ message: 'Registration successful! Please log in.' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// --- User Login Route ---
app.post('/login', async (req, res) => { // No need for express.json() here if app.use(express.json()) is global
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users[email];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials - user not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials - password incorrect' });
    }

    const tokenPayload = {
      email: email,
      username: user.username
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

    res.json({ message: 'Login successful!', token: token, username: user.username });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// --- Add Game to Collection Route ---
app.post('/collection', (req, res) => { // No need for express.json() here if app.use(express.json()) is global
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET); // Verify token using your defined JWT_SECRET
    const userEmail = decodedToken.email;

    if (!collections[userEmail]) {
      collections[userEmail] = [];
    }
    // req.body should contain { gameId, gameTitle, gameImage } from the frontend
    const gameToAdd = req.body;
    if (!gameToAdd || !gameToAdd.gameId || !gameToAdd.gameTitle) {
        return res.status(400).json({ error: 'Game data (gameId, gameTitle) is required'});
    }

    collections[userEmail].push(gameToAdd);
    console.log(`Game added to ${userEmail}'s collection:`, gameToAdd); // For debugging
    console.log(`Current collection for ${userEmail}:`, collections[userEmail]); // For debugging
    res.status(201).json({ message: 'Game added to your collection!' });

  } catch (error) {
    console.error('Error adding to collection / Invalid token:', error.message);
    res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
});

// --- Get User's Collection Route ---
app.get('/collection', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET); // Verify token
    const userEmail = decodedToken.email;

    console.log(`Workspaceing collection for: ${userEmail}`); // For debugging
    const userCollection = collections[userEmail] || [];
    console.log(`Returning collection:`, userCollection); // For debugging
    res.json(userCollection);

  } catch (error) {
    console.error('Error fetching collection / Invalid token:', error.message);
    res.status(403).json({ error: 'Unauthorized access or invalid token. Please log in again.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});