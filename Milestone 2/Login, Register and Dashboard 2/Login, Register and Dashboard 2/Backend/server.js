// server.js

// Import necessary libraries
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Using bcryptjs
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');

// --- Sequelize and Database Connection Setup ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './gamescape_database.sqlite', // Path to the database file in Backend folder
  logging: console.log // Shows SQL queries in console; set to false to disable
});

// --- Define User Model ---
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'users' });

// --- Define CollectedGame Model (with rating) ---
const CollectedGame = sequelize.define('CollectedGame', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  rawgGameId: { type: DataTypes.INTEGER, allowNull: false },
  gameTitle: { type: DataTypes.STRING, allowNull: false },
  gameImage: { type: DataTypes.STRING, allowNull: true },
  rating: { // Field to store the game's rating when added
    type: DataTypes.FLOAT, // Ratings can be decimals
    allowNull: true
  }
  // userId will be added by Sequelize association
}, { tableName: 'collected_games' });

// --- Define Associations ---
User.hasMany(CollectedGame, {
  foreignKey: { name: 'userId', allowNull: false },
  onDelete: 'CASCADE'
});
CollectedGame.belongsTo(User, {
  foreignKey: { name: 'userId', allowNull: false }
});

// --- Express App Setup ---
const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// --- Configuration ---
const port = process.env.PORT || 8080; // Ensure this matches frontend calls
const RAWG_API_KEY = '49019cbf03744419a483362b07d2f0a1'; // Your RAWG API Key

// --- IMPORTANT: JWT Secret Key ---
// REPLACE THIS WITH YOUR OWN UNIQUE, STRONG SECRET! DO NOT USE YOUR RAWG API KEY.
const JWT_SECRET = 'YOUR_VERY_OWN_SUPER_STRONG_AND_RANDOM_SECRET_KEY_123!@#';

// --- Routes ---

// Root Route
app.get('/', (req, res) => {
  res.send('Hello World! Your GameScape backend server is running.');
});

// Search Games from RAWG
app.get('/api/games/search', async (req, res) => {
  const { query: searchQuery } = req.query;
  if (!searchQuery) {
    return res.status(400).json({ message: 'Search query is required' });
  }
  if (!RAWG_API_KEY) {
    console.error('RAWG API Key is missing in server config.');
    return res.status(500).json({ message: 'Server configuration error' });
  }
  const rawgUrl = `https://api.rawg.io/api/games`;
  try {
    console.log(`Searching RAWG for: ${searchQuery}`);
    const response = await axios.get(rawgUrl, {
      params: { key: RAWG_API_KEY, search: searchQuery, page_size: 10 }
    });
    console.log(`Successfully fetched search data from RAWG.`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching search data from RAWG API:', error.message);
    if (error.response) {
      console.error('RAWG Response Status:', error.response.status, 'Data:', error.response.data);
    }
    res.status(500).json({ message: 'Error fetching data from external API' });
  }
});

// Get Specific Game Details from RAWG
app.get('/api/games/:id', async (req, res) => {
  const { id: gameId } = req.params;
  if (!RAWG_API_KEY) {
    console.error('RAWG API Key is missing in server config for game details.');
    return res.status(500).json({ message: 'Server configuration error' });
  }
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  const rawgDetailUrl = `https://api.rawg.io/api/games/${gameId}`;
  try {
    console.log(`Fetching details for game ID: ${gameId} from RAWG...`);
    const response = await axios.get(rawgDetailUrl, {
      params: { key: RAWG_API_KEY }
    });
    console.log(`Successfully fetched details for game ID: ${gameId}`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching details for game ID ${gameId} from RAWG API:`, error.message);
    if (error.response) {
      console.error('RAWG Response Status:', error.response.status, 'Data:', error.response.data);
    }
    res.status(500).json({ message: `Error fetching game details for ID ${gameId}` });
  }
});

// User Registration
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    const existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = await User.create({ username, email, password: hashedPassword });
    console.log('User registered and saved to database:', newUser.toJSON());
    res.status(201).json({
      message: 'Registration successful! Please log in.',
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    console.error("Error during database registration:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already registered (database constraint).' });
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ error: 'Validation error(s)', details: messages });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const userInDb = await User.findOne({ where: { email: email } });
    if (!userInDb) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, userInDb.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const tokenPayload = { id: userInDb.id, email: userInDb.email, username: userInDb.username };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
    console.log(`User logged in successfully: ${userInDb.email} (ID: ${userInDb.id})`);
    res.json({
      message: 'Login successful!',
      token: token,
      user: { id: userInDb.id, username: userInDb.username, email: userInDb.email }
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Add Game to User's Collection
app.post('/collection', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const userIdFromToken = decodedToken.id;
    if (!userIdFromToken) {
      return res.status(403).json({ error: 'Forbidden: Token is invalid (missing user ID)' });
    }

    const { gameId, gameTitle, gameImage, rating } = req.body; // Expect rating from frontend
    if (typeof gameId === 'undefined' || !gameTitle) {
      return res.status(400).json({ error: 'Bad Request: gameId and gameTitle are required' });
    }

    const existingEntry = await CollectedGame.findOne({
      where: { userId: userIdFromToken, rawgGameId: gameId }
    });
    if (existingEntry) {
      const currentCollection = await CollectedGame.findAll({ where: { userId: userIdFromToken } });
      return res.status(200).json({ message: 'Game is already in your collection', collection: currentCollection });
    }

    const gameToSave = {
      userId: userIdFromToken,
      rawgGameId: parseInt(gameId),
      gameTitle: gameTitle,
      gameImage: gameImage,
      rating: rating // Save the rating
    };
    console.log('POST /collection: Attempting to create entry in DB with:', gameToSave);
    const newCollectedGame = await CollectedGame.create(gameToSave);
    console.log(`POST /collection: Game rawgGameId ${newCollectedGame.rawgGameId} added to userId ${userIdFromToken}'s collection.`);
    const updatedCollection = await CollectedGame.findAll({ where: { userId: userIdFromToken }, order: [['createdAt', 'DESC']] });
    res.status(201).json({ message: 'Game added to your collection!', collection: updatedCollection });
  } catch (error) {
    console.error('POST /collection: Error ->', error.name, ':', error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token.' });
    }
    console.error('POST /collection: Full error object:', error);
    res.status(500).json({ error: 'Server error while adding game to collection' });
  }
});

// Get User's Collection
app.get('/collection', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const userIdFromToken = decodedToken.id;
    if (!userIdFromToken) {
      return res.status(403).json({ error: 'Forbidden: Token is invalid (missing user ID)' });
    }
    console.log(`GET /collection: Fetching collection for userId ${userIdFromToken}...`);
    const userCollection = await CollectedGame.findAll({
      where: { userId: userIdFromToken },
      order: [['createdAt', 'DESC']]
    });
    console.log(`GET /collection: Found ${userCollection.length} items for userId ${userIdFromToken}.`);
    res.status(200).json(userCollection);
  } catch (error) {
    console.error('GET /collection: Error ->', error.name, ':', error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token.' });
    }
    console.error('GET /collection: Full error object:', error);
    res.status(500).json({ error: 'Server error while fetching collection' });
  }
});

// Remove Game from User's Collection
app.delete('/collection/:rawgGameId', async (req, res) => {
    const authHeader = req.headers.authorization;
    const rawgGameIdToRemove = parseInt(req.params.rawgGameId);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }
    const token = authHeader.split(' ')[1];

    if (isNaN(rawgGameIdToRemove)) {
        return res.status(400).json({ error: 'Bad Request: Valid rawgGameId parameter is required' });
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        const userIdFromToken = decodedToken.id;
        if (!userIdFromToken) {
            return res.status(403).json({ error: 'Forbidden: Token is invalid (missing user ID)' });
        }

        console.log(`Attempting to remove rawgGameId: ${rawgGameIdToRemove} for userId: ${userIdFromToken}`);
        const result = await CollectedGame.destroy({
            where: { userId: userIdFromToken, rawgGameId: rawgGameIdToRemove }
        });

        if (result > 0) {
            console.log(`Game rawgGameId ${rawgGameIdToRemove} removed from collection for userId ${userIdFromToken}.`);
            const updatedCollection = await CollectedGame.findAll({ where: { userId: userIdFromToken }, order: [['createdAt', 'DESC']] });
            res.status(200).json({ message: 'Game removed from collection', collection: updatedCollection });
        } else {
            console.log(`Game rawgGameId ${rawgGameIdToRemove} not found in collection for userId ${userIdFromToken}.`);
            const currentCollection = await CollectedGame.findAll({ where: { userId: userIdFromToken }, order: [['createdAt', 'DESC']] });
            res.status(404).json({ error: 'Game not found in collection', collection: currentCollection });
        }
    } catch (error) {
        console.error('Error in DELETE /collection/:rawgGameId:', error.message);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
        }
        res.status(500).json({ error: 'Server error while removing game from collection' });
    }
});


// --- Initialize Database and Start Server ---
async function initializeDatabaseAndStartServer() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
    // Use { alter: true } carefully in development.
    // If you are sure your schema is stable or prefer manual migrations, use sequelize.sync()
    await sequelize.sync({ alter: false });
    console.log('All models were synchronized successfully. Tables are ready.');
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database or sync models:', error);
    process.exit(1);
  }
}

initializeDatabaseAndStartServer();
