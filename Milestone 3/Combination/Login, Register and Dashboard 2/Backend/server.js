// FILE: Backend/server.js (The NEW, shorter version with Sessions)

// Import necessary libraries
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const axios = require('axios');

// --- Sequelize and Database Connection Setup ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './gamescape_database.sqlite',
  logging: false // Disabled for cleaner output, set to console.log to see SQL
});

// --- Define Models ---
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  age: { type: DataTypes.INTEGER, allowNull: true },
  avatar_url: { type: DataTypes.STRING, allowNull: true } // URL to the uploaded avatar
}, { tableName: 'users' });

const CollectedGame = sequelize.define('CollectedGame', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  rawgGameId: { type: DataTypes.INTEGER, allowNull: false },
  gameTitle: { type: DataTypes.STRING, allowNull: false },
  gameImage: { type: DataTypes.STRING, allowNull: true },
  rating: { type: DataTypes.FLOAT, allowNull: true }
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
// IMPORTANT: For sessions with cookies, cors must be configured to allow credentials
app.use(cors({
    origin: 'http://localhost:5500', // Or your specific frontend URL (e.g., http://localhost:5500)
    credentials: true
}));
app.use(express.json());


// +++ NEW: Serve the 'uploads' folder statically +++
// This makes avatar images accessible to the browser via a URL like /uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Configuration ---
const port = process.env.PORT || 8080;
const RAWG_API_KEY = '49019cbf03744419a483362b07d2f0a1'; // Your RAWG API Key
// This is the new secret for signing session cookies. REPLACE IT!
const SESSION_SECRET = 'your_own_new_super_strong_session_secret_!@#$';

// --- Session Middleware Setup ---
app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions_database.sqlite', // Will create this file to store sessions
      dir: './', // The directory to store the database file
      concurrentDB: true
    }),
    secret: SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7 // Cookie/Session expires in 7 days
      // sameSite: 'lax',
      // secure: true, // Uncomment this in production if you are using HTTPS
    }
  })
);

// --- Import and Use Routers ---
// Pass dependencies (models, keys) to the route modules
const authRouter = require('./routes/auth')(User, bcrypt);
const collectionRouter = require('./routes/collection')(CollectedGame);
const gamesRouter = require('./routes/games')(RAWG_API_KEY, axios);
// +++ NEW: Import profile router +++
const profileRouter = require('./routes/profile')(User);

// Mount the routers on specific paths
app.use('/', authRouter); // For /register, /login, /logout
app.use('/collection', collectionRouter);
app.use('/api/games', gamesRouter);
app.use('/profile', profileRouter); // +++ NEW: Mount the profile router

// --- Initialize Database and Start Server ---
async function initializeDatabaseAndStartServer() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
    // Using alter:false as per your previous success to avoid data loss
    await sequelize.sync({ alter: false });
    console.log('All models were synchronized successfully.');
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database or sync models:', error);
    process.exit(1);
  }
}

initializeDatabaseAndStartServer();