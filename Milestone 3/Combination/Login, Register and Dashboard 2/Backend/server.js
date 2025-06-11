// FILE: Backend/server.js

// --- Imports ---
const express = require('express');
const axios =require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { Sequelize, DataTypes } = require('sequelize');
const multer = require("multer");
const path = require("path");

// --- Sequelize Setup ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './gamescape_database.sqlite',
  logging: false // Set to console.log to see SQL queries
});

// --- Model Definitions ---
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  avatar_url: { type: DataTypes.STRING, allowNull: true },
  age: { type: DataTypes.INTEGER, allowNull: true },
  address: { type: DataTypes.STRING, allowNull: true }
}, { tableName: 'users' });

const CollectedGame = sequelize.define('CollectedGame', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  rawgGameId: { type: DataTypes.INTEGER, allowNull: false },
  gameTitle: { type: DataTypes.STRING, allowNull: false },
  gameImage: { type: DataTypes.STRING, allowNull: true },
  rating: { type: DataTypes.FLOAT, allowNull: true }
}, { tableName: 'collected_games' });

// --- Associations ---
User.hasMany(CollectedGame, { foreignKey: 'userId', onDelete: 'CASCADE' });
CollectedGame.belongsTo(User, { foreignKey: 'userId' });

// --- App Setup ---
const app = express();
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Allow both common Live Server origins
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Configuration ---
const port = process.env.PORT || 8080;
const RAWG_API_KEY = '49019cbf03744419a483362b07d2f0a1';
const SESSION_SECRET = 'your_own_new_super_strong_session_secret_!@#$'; // REPLACE THIS!

// --- Multer Setup ---
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// --- Session Middleware Setup ---
app.use(
  session({
    store: new SQLiteStore({ db: 'sessions_database.sqlite', dir: './', concurrentDB: true }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
  })
);


// =================================================================
// --- Middleware for Authentication ---
// =================================================================
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: You must be logged in.' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
};


// =================================================================
// --- Routes ---
// =================================================================

// --- Public Routes ---
app.get('/', (req, res) => res.send('GameScape server is running.'));

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, email, password: hashedPassword });
        res.status(201).json({ message: 'Registration successful! Please log in.' });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.session.user = { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin };
        res.json({ message: 'Login successful!', user: req.session.user });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) { return res.status(500).json({ message: 'Could not log out.' }); }
        res.status(200).json({ message: 'Logout successful!' });
    });
});

// Game API Routes
app.get('/api/games/search', async (req, res) => {
    const { query: searchQuery } = req.query;
    if (!searchQuery) return res.status(400).json({ message: 'Search query is required' });
    const rawgUrl = `https://api.rawg.io/api/games`;
    try {
        const response = await axios.get(rawgUrl, { params: { key: RAWG_API_KEY, search: searchQuery, page_size: 10 }});
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching search data' });
    }
});
app.get('/api/games/:id', async (req, res) => {
    const { id: gameId } = req.params;
    if (!gameId) return res.status(400).json({ message: 'Game ID is required' });
    const rawgDetailUrl = `https://api.rawg.io/api/games/${gameId}`;
    try {
        const response = await axios.get(rawgDetailUrl, { params: { key: RAWG_API_KEY }});
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: `Error fetching details for game ID ${gameId}` });
    }
});


// --- Authenticated User Routes ---
app.use('/collection', isAuthenticated);
app.get('/collection', async (req, res) => {
    const userId = req.session.user.id;
    const userCollection = await CollectedGame.findAll({ where: { userId } });
    res.json(userCollection);
});
app.post('/collection', async (req, res) => {
    const userId = req.session.user.id;
    const { gameId, gameTitle, gameImage, rating } = req.body;
    await CollectedGame.findOrCreate({
        where: { userId, rawgGameId: gameId },
        defaults: { userId, rawgGameId: gameId, gameTitle, gameImage, rating }
    });
    res.status(201).json({ message: 'Game added/found in collection.' });
});
app.delete('/collection/:rawgGameId', async (req, res) => {
    const userId = req.session.user.id;
    const { rawgGameId } = req.params;
    const result = await CollectedGame.destroy({ where: { userId, rawgGameId }});
    if (result > 0) {
        res.json({ message: 'Game removed from collection.' });
    } else {
        res.status(404).json({ error: 'Game not found in collection.' });
    }
});


// --- Admin Routes ---
const adminRouter = express.Router();
adminRouter.use(isAuthenticated, isAdmin); // All routes below this require admin login

// List all users
adminRouter.get('/users', async (req, res) => {
    try {
        const allUsers = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(allUsers);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching users' });
    }
});

// Add a new user (by an admin)
adminRouter.post('/users/add', async (req, res) => {
    try {
        const { username, email, password, isAdmin } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, email, password: hashedPassword, isAdmin: !!isAdmin }); // '!!' converts value to boolean
        res.status(201).json({ message: 'User created successfully by admin.' });
    } catch (error) {
        console.error('Error in POST /admin/users/add:', error);
        res.status(500).json({ error: 'Server error creating user.' });
    }
});

// Delete a user
adminRouter.delete('/users/:id', async (req, res) => {
    try {
        if (req.session.user.id === parseInt(req.params.id)) {
            return res.status(400).json({ error: 'Admins cannot delete their own account.' });
        }
        const deletedCount = await User.destroy({ where: { id: req.params.id } });
        if (deletedCount > 0) {
            res.status(200).json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch(error) {
        res.status(500).json({ error: 'Server error deleting user' });
    }
});

// Update a user's details (by admin)
adminRouter.put('/users/:id/update', upload.single("avatar"), async (req, res) => {
    try {
        const { id: userId } = req.params;
        const { username, address, isAdmin } = req.body;
        const updateFields = {};

        if (username) updateFields.username = username;
        if (address) updateFields.address = address;
        if (typeof isAdmin !== 'undefined') updateFields.isAdmin = (isAdmin === 'true' || isAdmin === true);
        if (req.file) {
            updateFields.avatar_url = `/uploads/${req.file.filename}`;
        }
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ error: 'No fields to update provided.' });
        }

        await User.update(updateFields, { where: { id: userId } });
        res.json({ success: true, message: "User updated successfully." });
    } catch (error) {
        res.status(500).json({ error: 'Server error updating user.' });
    }
});


const profileRouter = require('./routes/profile')(User);

// Mount the admin router under the /admin path
app.use('/admin', adminRouter);
app.use('/profile', profileRouter);


// --- Initialize and Start Server ---
async function initializeDatabaseAndStartServer() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database established.');
    await sequelize.sync({ alter: false });
    console.log('All models synchronized.');
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}
initializeDatabaseAndStartServer();
