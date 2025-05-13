// server.js

// Load environment variables from .env file
require('dotenv').config(); // <<< Make sure this is at the very top

// Import necessary libraries
const express = require('express');
const axios = require('axios'); // <<< Import axios

// Create an instance of an Express application
const app = express();

// Define the port the server will run on
const port = process.env.PORT || 3000;

// In-memory user store
const bcrypt = require('bcrypt');
const users = {};

// In-memory storage for favorites
const jwt = require('jsonwebtoken');
const collections = {};

// --- Your Root Route (keep it for basic checks) ---
app.get('/', (req, res) => {
  res.send('Hello World! Your GameScape backend server is running.');
});

// --- NEW: Route for searching games on RAWG ---
app.get('/api/games/search', async (req, res) => {
  // Get the search query from the URL (?query=...)
  const searchQuery = req.query.query; // e.g., 'elden ring'
  const apiKey = process.env.RAWG_API_KEY;

  // --- Input Validation ---
  if (!searchQuery) {
    // If no search query is provided
    return res.status(400).json({ message: 'Search query is required' });
  }

  if (!apiKey) {
    // If API key is missing in environment variables
    console.error('RAWG API Key is missing. Make sure it is set in the .env file.');
    return res.status(500).json({ message: 'Server configuration error: API Key missing' });
  }

  // --- Call the RAWG API ---
  const rawgUrl = `https://api.rawg.io/api/games`; // Base URL for games endpoint

  try {
    console.log(`Searching RAWG for: ${searchQuery}`); // Log what we're searching for

    // Make the request to RAWG using axios
    const response = await axios.get(rawgUrl, {
      params: {
        key: apiKey,        // Your API key
        search: searchQuery, // The game name to search for
        page_size: 10       // Limit results (optional, good practice)
        // Add other params as needed based on RAWG docs (e.g., platforms, genres)
      }
    });

    // Log success and send the results back to the client
    console.log(`Successfully fetched data from RAWG.`);
    res.json(response.data); // Send the whole response data from RAWG

  } catch (error) {
    // --- Error Handling ---
    console.error('Error fetching data from RAWG API:', error.message);
    // Log more details if available (e.g., response from RAWG if the error has one)
    if (error.response) {
      console.error('RAWG Response Status:', error.response.status);
      console.error('RAWG Response Data:', error.response.data);
    }
    res.status(500).json({ message: 'Error fetching data from external API' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});



app.post('/register', express.json(), async (req, res) => {
  const { username, email, password } = req.body;
  if (users[email]) return res.status(400).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  users[email] = { username, password: hashed };
  res.status(201).json({ message: 'Registration successful' });
});

// Add to favorites
app.post('/collection', express.json(), (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const user = jwt.verify(token, process.env.RAWG_API_KEY || 'your_secret_key');
    if (!collections[user.email]) collections[user.email] = [];
    collections[user.email].push(req.body);
    res.json({ message: 'Added to favorites!' });
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
});

// Get favorites
app.get('/collection', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const user = jwt.verify(token, process.env.RAWG_API_KEY || 'your_secret_key');
    res.json(collections[user.email] || []);
  } catch {
    res.status(403).json({ error: 'Unauthorized access' });
  }
});
