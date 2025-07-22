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

// --- Import and Use Routers ---
const profileRouter = require('./routes/profile')(User);
const authRouter = require('./routes/auth')(User, bcrypt);
const gamesRouter = require('./routes/games')(RAWG_API_KEY, axios);
const collectionRouter = require('./routes/collection')(CollectedGame);
const adminRouter = require('./routes/admin')(User, upload);

// Mount the admin router under the /admin path
// app.use('/admin', adminRouter);
app.use('/profile', profileRouter);
app.use('/', authRouter); // Handles /register, /login, /logout
app.use('/api/games', gamesRouter);
app.use('/collection', collectionRouter);
app.use('/admin', adminRouter);


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
