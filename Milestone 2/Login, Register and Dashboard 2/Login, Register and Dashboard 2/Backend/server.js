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
  const apiKey = '49019cbf03744419a483362b07d2f0a1';

  if (!apiKey) {
    console.error('RAWG API Key is missing in code for game details.');
    return res.status(500).json({ message: 'Server configuration error: API Key missing' });
  }
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }

  const rawgDetailUrl = `https://api.rawg.io/api/games/${gameId}`;
  try {
    console.log(`Workspaceing details for game ID: ${gameId} from RAWG...`);
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
app.post('/register', async (req, res) => {
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
app.post('/login', async (req, res) => {
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

// +++ IMPLEMENTING /collection Endpoints +++

// --- Add Game to User's Collection (POST) ---
app.post('/collection', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET); // Verify using your actual JWT_SECRET
        const userEmail = decodedToken.email;

        if (!userEmail) {
            // This case should ideally be caught by jwt.verify if email is not in payload
            return res.status(403).json({ error: 'Forbidden: Token is invalid (missing email)' });
        }

        const gameData = req.body;
        // Basic validation for incoming game data (expected from your frontend addToCollection)
        if (!gameData || typeof gameData.gameId === 'undefined' || !gameData.gameTitle) { // gameId can be 0
            return res.status(400).json({ error: 'Bad Request: gameId and gameTitle are required in the request body' });
        }

        if (!collections[userEmail]) {
            collections[userEmail] = []; // Initialize collection for the user if it doesn't exist
        }

        // Optional: Check if the game (by gameId) already exists in this user's collection
        const gameExists = collections[userEmail].find(game => game.gameId === gameData.gameId);
        if (gameExists) {
            console.log(`Game ID ${gameData.gameId} already in ${userEmail}'s collection.`);
            return res.status(200).json({ message: 'Game is already in your collection', collection: collections[userEmail] });
        }

        collections[userEmail].push(gameData);
        console.log(`Game added to ${userEmail}'s collection. Current collection size: ${collections[userEmail].length}`);
        // For debugging, you can log the whole collection: console.log(collections[userEmail]);
        res.status(201).json({ message: 'Game added to your collection!', collection: collections[userEmail] });

    } catch (error) {
        console.error('Error in POST /collection:', error.message);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token. Please log in again.' });
        }
        res.status(500).json({ error: 'Server error while adding game to collection' });
    }
});

// --- Get User's Collection (GET) ---
app.get('/collection', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET); // Verify using your actual JWT_SECRET
        const userEmail = decodedToken.email;

        if (!userEmail) {
            return res.status(403).json({ error: 'Forbidden: Token is invalid (missing email)' });
        }

        const userCollection = collections[userEmail] || []; 
        console.log(`Workspaceing collection for ${userEmail}. Found ${userCollection.length} items.`);
        res.status(200).json(userCollection);

    } catch (error) {
        console.error('Error in GET /collection:', error.message);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token. Please log in again.' });
        }
        res.status(500).json({ error: 'Server error while fetching collection' });
    }
});

// +++ END OF /collection Endpoints +++

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});