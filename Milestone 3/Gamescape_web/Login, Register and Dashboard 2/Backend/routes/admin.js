const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthenticated');
const isAdmin = require('../middleware/isAdmin');
const bcrypt = require('bcryptjs');

module.exports = (User, upload) => {
    router.use(isAuthenticated, isAdmin); // Protect all routes in this file

    // List all users
    router.get('/users', async (req, res) => {
        try {
            const allUsers = await User.findAll({ attributes: { exclude: ['password'] } });
            res.json(allUsers);
        } catch (error) {
            res.status(500).json({ error: 'Server error fetching users' });
        }
    });

    // Add a new user (by an admin)
    router.post('/users/add', async (req, res) => {
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
        await User.create({ username, email, password: hashedPassword, isAdmin: !!isAdmin });
        res.status(201).json({ message: 'User created successfully by admin.' });
    } catch (error) {
        console.error('Error in POST /admin/users/add:', error);
        res.status(500).json({ error: 'Server error creating user.' });
    }
    });

    // Delete a user
    router.delete('/users/:id', async (req, res) => {
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
    router.put('/users/:id/update', upload.single("avatar"), async (req, res) => {
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

    return router;

};
