// server.js

// Import necessary libraries
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Using bcryptjs - easier to install
const jwt = require('jsonwebtoken');


// +++ NEW: Import Sequelize +++
const { Sequelize, DataTypes } = require('sequelize');

// +++ NEW: Setup Sequelize and Database Connection +++
// This will create a file named 'gamescape_database.sqlite' in your Backend directory
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './gamescape_database.sqlite', // Path to the database file
  logging: console.log // Set to console.log to see SQL queries, or 'false' to disable
});

// +++ NEW: Define the User Model +++
const User = sequelize.define('User', {
  // Model attributes are defined here
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Ensure emails are unique
    validate: {
      isEmail: true // Add validation for email format
    }
  },
  password: { // This will store the HASHED password
    type: DataTypes.STRING,
    allowNull: false
  }
  // Sequelize automatically adds 'createdAt' and 'updatedAt' fields
}, {
  // Other model options go here
  tableName: 'users' // Explicitly set table name
});


// +++ NEW: Define the CollectedGame Model +++
const CollectedGame = sequelize.define('CollectedGame', {
  id: { // Primary key for this table
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  rawgGameId: { // The ID of the game from the RAWG API
    type: DataTypes.INTEGER, // Assuming RAWG IDs are integers
    allowNull: false
  },
  gameTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gameImage: { // URL for the game's background image
    type: DataTypes.STRING,
    allowNull: true // An image might not always be present
  },
  // userId will be added automatically by Sequelize due to the association defined below
}, {
  tableName: 'collected_games' // Explicitly set table name
});

// +++ NEW: Define Associations between User and CollectedGame +++
// A User can have many CollectedGames
User.hasMany(CollectedGame, {
  foreignKey: {
    name: 'userId', // This will create a userId column in the CollectedGame table
    allowNull: false
  },
  onDelete: 'CASCADE' // If a user is deleted, delete their collected games too
});
// A CollectedGame belongs to one User
CollectedGame.belongsTo(User, {
  foreignKey: {
    name: 'userId',
    allowNull: false
  }
});



// Create an instance of an Express application
const app = express();

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Crucial for parsing JSON request bodies for register/login/collection

// Define the port the server will run on
const port = process.env.PORT || 8080;

// --- In-memory storage (Data will be lost on server restart) ---
//const users = {}; // Format: users['user@example.com'] = { username: 'name', password: 'hashedPassword' }
//const collections = {}; // Format: collections['user@example.com'] = [{gameId: ..., gameTitle: ..., gameImage: ...}, ...]

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


// --- User Registration Route (Modified to use Sequelize User model) ---
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user with this email already exists in the database
    const existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      console.log(`Registration attempt for existing email: ${email}`);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the new user in the database
    const newUser = await User.create({
      username: username,
      email: email,
      password: hashedPassword // Store the hashed password
    });

    // newUser contains the created user data from the database, including the auto-generated id
    console.log('User registered and saved to database:', newUser.toJSON()); // .toJSON() gives a plain object

    // Respond with success message (don't send back the password, even hashed)
    res.status(201).json({
        message: 'Registration successful! Please log in.',
        user: { // Optionally send back some non-sensitive user info
            id: newUser.id,
            username: newUser.username,
            email: newUser.email
        }
    });

  } catch (error) {
    console.error("Error during database registration:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      // This error occurs if 'unique: true' constraint is violated (e.g., email already exists)
      // Our manual check above should catch it first for email, but this is a good fallback.
      return res.status(400).json({ error: 'Email already registered (database constraint).' });
    }
    if (error.name === 'SequelizeValidationError') {
      // This occurs if model validations fail (e.g., allowNull: false, or the isEmail validation)
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ error: 'Validation error(s)', details: messages });
    }
    // General server error
    res.status(500).json({ error: 'Server error during registration' });
  }
});




// --- User Login Route (Modified to use Sequelize User model) ---
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find the user in the database by email
    const userInDb = await User.findOne({ where: { email: email } });

    if (!userInDb) {
      // User not found with that email.
      // It's good security practice to give a generic message for both non-existent user and wrong password.
      console.log(`Login attempt for non-existent email: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, userInDb.password);

    if (!isMatch) {
      // Password does not match
      console.log(`Login attempt with incorrect password for email: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' }); // Generic message
    }

    // User authenticated successfully, create JWT
    // Include user ID in the token payload, it's useful for associating data later
    const tokenPayload = {
      id: userInDb.id,
      email: userInDb.email,
      username: userInDb.username
    };

    // JWT_SECRET should be defined globally in your server.js
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

    console.log(`User logged in successfully: ${userInDb.email} (ID: ${userInDb.id})`);
    res.json({
      message: 'Login successful!',
      token: token,
      user: { // Send back some user info (excluding password)
        id: userInDb.id,
        username: userInDb.username,
        email: userInDb.email
      }
    });

  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: 'Server error during login' });
  }
});




// --- Add Game to User's Collection (POST) - Database Version ---
app.post('/collection', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('POST /collection: Auth header missing or malformed');
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }
    const token = authHeader.split(' ')[1];
    console.log('POST /collection: Token received');

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        console.log('POST /collection: Token decoded:', decodedToken);
        const userIdFromToken = decodedToken.id;

        if (!userIdFromToken) {
            console.log('POST /collection: userId missing in decoded token');
            return res.status(403).json({ error: 'Forbidden: Token is invalid (missing user ID)' });
        }

        const gameData = req.body;
        console.log('POST /collection: Received gameData from request body:', gameData);

        if (typeof gameData.gameId === 'undefined' || !gameData.gameTitle) {
            console.log('POST /collection: Bad request - gameId or gameTitle missing');
            return res.status(400).json({ error: 'Bad Request: gameId and gameTitle are required' });
        }

        console.log(`POST /collection: Checking if gameId ${gameData.gameId} for userId ${userIdFromToken} already exists...`);
        const existingEntry = await CollectedGame.findOne({
            where: {
                userId: userIdFromToken,
                rawgGameId: gameData.gameId
            }
        });

        if (existingEntry) {
            console.log(`POST /collection: Game ID ${gameData.gameId} already in user ID ${userIdFromToken}'s collection.`);
            const currentCollection = await CollectedGame.findAll({ where: { userId: userIdFromToken } });
            return res.status(200).json({ message: 'Game is already in your collection', collection: currentCollection });
        }

        const gameToSave = {
            userId: userIdFromToken,
            rawgGameId: parseInt(gameData.gameId), // Ensure rawgGameId is an integer if your model expects it
            gameTitle: gameData.gameTitle,
            gameImage: gameData.gameImage
        };
        console.log('POST /collection: Attempting to create entry in DB with:', gameToSave);
        const newCollectedGame = await CollectedGame.create(gameToSave);

        console.log(`POST /collection: Game rawgGameId ${newCollectedGame.rawgGameId} (DB ID: ${newCollectedGame.id}) added to userId ${userIdFromToken}'s collection.`);
        const updatedCollection = await CollectedGame.findAll({ where: { userId: userIdFromToken } });
        res.status(201).json({ message: 'Game added to your collection!', collection: updatedCollection });

    } catch (error) {
        console.error('POST /collection: Error ->', error.name, ':', error.message);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token. Please log in again.' });
        }
        // Log the full error for more details if it's a Sequelize or other error
        console.error('POST /collection: Full error object:', error);
        res.status(500).json({ error: 'Server error while adding game to collection' });
    }
});

// --- Get User's Collection (GET) - Database Version ---
app.get('/collection', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('GET /collection: Auth header missing or malformed');
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }
    const token = authHeader.split(' ')[1];
    console.log('GET /collection: Token received');

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        console.log('GET /collection: Token decoded:', decodedToken);
        const userIdFromToken = decodedToken.id;

        if (!userIdFromToken) {
            console.log('GET /collection: userId missing in decoded token');
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
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token. Please log in again.' });
        }
        console.error('GET /collection: Full error object:', error);
        res.status(500).json({ error: 'Server error while fetching collection' });
    }
});



// +++ NEW: Function to test DB connection and sync models +++
async function initializeDatabaseAndStartServer() {
  try {
    await sequelize.authenticate(); // Test the connection
    console.log('Connection to the database has been established successfully.');

    // Sync all defined models to the DB.
    // This creates the table if it doesn't exist (and does nothing if it already exists).
    // Use { alter: true } in development to make Sequelize try to update tables to match model changes.
    // Use { force: true } to drop and recreate tables (DANGEROUS - DELETES DATA). Not recommended for general use.
    await sequelize.sync({ alter: false }); // Using alter: true for development flexibility
    console.log('All models were synchronized successfully. User table is ready.');

    // Start the server only after DB sync is successful
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });

  } catch (error) {
    console.error('Unable to connect to the database or sync models:', error);
    // Exit the process if DB connection fails, as the app might not function correctly
    process.exit(1);
  }
}

// Call the function to initialize DB and start the server
initializeDatabaseAndStartServer();

// // Start the server
// app.listen(port, () => {
//   console.log(`Server listening at http://localhost:${port}`);
// });