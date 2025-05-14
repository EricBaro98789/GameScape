// server.js

// We remove require('dotenv').config(); because we are not loading from .env for the API key

// Import necessary libraries
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Create an instance of an Express application
const app = express();

app.use(cors()); // Enable CORS for all routes

// Define the port the server will run on
// Your frontend dashboard.html is trying to reach http://localhost:8080
// So, let's set the backend to also use 8080 for consistency, or you can change the frontend.
const port = process.env.PORT || 8080; // <<<< Adjusted to 8080 to match your dashboard.html

// --- Your Root Route (keep it for basic checks) ---
app.get('/', (req, res) => {
  res.send('Hello World! Your GameScape backend server is running.');
});

// --- Route for searching games on RAWG ---
app.get('/api/games/search', async (req, res) => {
  // Get the search query from the URL (?query=...)
  const searchQuery = req.query.query; // e.g., 'elden ring'

  // API Key is now hardcoded here
  const apiKey = '49019cbf03744419a483362b07d2f0a1'; // <<< YOUR API KEY IS DIRECTLY IN THE CODE

  // --- Input Validation for searchQuery ---
  if (!searchQuery) {
    // If no search query is provided
    return res.status(400).json({ message: 'Search query is required' });
  }

  // Although hardcoded, a check for an empty apiKey string might still be useful
  if (!apiKey) {
    // This case should ideally not be reached if the key is hardcoded correctly
    console.error('API Key is missing in the code.');
    return res.status(500).json({ message: 'Server configuration error: API Key is missing in code' });
  }

  // --- Call the RAWG API ---
  const rawgUrl = `https://api.rawg.io/api/games`; // Base URL for games endpoint

  try {
    console.log(`Searching RAWG for: ${searchQuery}`); // Log what we're searching for

    // Make the request to RAWG using axios
    const response = await axios.get(rawgUrl, {
      params: {
        key: apiKey,         // Using the hardcoded apiKey variable
        search: searchQuery, // The game name to search for
        page_size: 10        // Limit results (optional, good practice)
      }
    });

    // Log success and send the results back to the client
    console.log(`Successfully fetched data from RAWG.`);
    res.json(response.data); // Send the whole response data from RAWG

  } catch (error) {
    // --- Error Handling ---
    console.error('Error fetching data from RAWG API:', error.message);
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

app.post('/login', express.json(), async (req, res) => {
  const { email, password } = req.body;
  const user = users[email];

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(403).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ email }, process.env.RAWG_API_KEY || 'your_secret_key');
  res.json({ token });
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
