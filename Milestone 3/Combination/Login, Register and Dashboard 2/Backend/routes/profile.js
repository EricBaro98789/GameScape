// FILE: Backend/routes/profile.js (NEW FILE)

const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// --- Multer Setup for File Uploads ---
// Configure where to store the uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Specifies the 'uploads' directory
    },
    filename: (req, file, cb) => {
        // Create a unique filename to prevent overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware to check if user is logged in via session
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: You must be logged in.' });
    }
};

module.exports = (User) => {
    // Apply the isAuthenticated middleware to all routes in this file
    router.use(isAuthenticated);

    // GET /profile - Get the current logged-in user's profile
    router.get('/', async (req, res) => {
        try {
            const userId = req.session.user.id;
            const userProfile = await User.findByPk(userId, {
                // Explicitly select which attributes to send back (exclude password)
                attributes: ['id', 'username', 'email', 'age', 'avatar_url']
            });

            if (!userProfile) {
                return res.status(404).json({ error: 'User profile not found.' });
            }
            res.status(200).json(userProfile);
        } catch (error) {
            console.error('GET /profile: Server error ->', error);
            res.status(500).json({ error: 'Server error while fetching profile.' });
        }
    });

    // PUT /profile - Update the current user's profile
    // 'upload.single('avatar')' is multer middleware to handle one file named 'avatar'
    router.put('/', upload.single('avatar'), async (req, res) => {
        try {
            const userId = req.session.user.id;
            const { username, age } = req.body;

            const fieldsToUpdate = {};
            if (username) fieldsToUpdate.username = username;
            if (age) fieldsToUpdate.age = parseInt(age);

            // If a new file was uploaded, add its path to the update object
            if (req.file) {
                // The URL path will be /uploads/filename.jpg
                fieldsToUpdate.avatar_url = `/uploads/${req.file.filename}`;
            }

            if (Object.keys(fieldsToUpdate).length === 0) {
                return res.status(400).json({ error: 'No update data provided.' });
            }

            await User.update(fieldsToUpdate, {
                where: { id: userId }
            });

            // Fetch the updated user data to send back
            const updatedUser = await User.findByPk(userId, {
                attributes: ['id', 'username', 'email', 'age', 'avatar_url']
            });

            // Also update the session with the new username if it changed
            if(updatedUser.username) {
                req.session.user.username = updatedUser.username;
            }

            res.status(200).json({ message: 'Profile updated successfully!', user: updatedUser });

        } catch (error) {
            console.error('PUT /profile: Server error ->', error);
            res.status(500).json({ error: 'Server error while updating profile.' });
        }
    });

    return router;
};