// FILE: Backend/routes/auth.js (Session Version)

const express = require('express');
// We no longer need JWT here

const router = express.Router();

// This module now accepts the User model and bcrypt library
module.exports = (User, bcrypt) => {
    // User Registration
    router.post('/register', async (req, res) => {
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
            await User.create({ username, email, password: hashedPassword });
            res.status(201).json({ message: 'Registration successful! Please log in.' });
        } catch (error) {
            console.error("Error during registration:", error);
            res.status(500).json({ error: 'Server error during registration' });
        }
    });

    // User Login
    router.post('/login', async (req, res) => {
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

            // Create a session for the user
            req.session.user = {
                id: userInDb.id,
                email: userInDb.email,
                username: userInDb.username,
                isAdmin: userInDb.isAdmin
            };

            console.log(`User logged in and session created: ${userInDb.email}`);
            res.json({ message: 'Login successful!', user: req.session.user });

        } catch (error) {
            console.error("Error during login:", error);
            res.status(500).json({ error: 'Server error during login' });
        }
    });

    // User Logout
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: 'Could not log out, please try again.' });
            }
            res.status(200).json({ message: 'Logout successful!' });
        });
    });

    return router;
};