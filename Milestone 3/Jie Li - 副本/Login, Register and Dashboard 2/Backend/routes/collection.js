// FILE: Backend/routes/collection.js (Session Version)

const express = require('express');

const router = express.Router();

// Middleware to check if user is logged in via session
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next(); // User is authenticated, proceed to the route handler
    } else {
        res.status(401).json({ error: 'Unauthorized: You must be logged in.' });
    }
};

// This module now only needs the CollectedGame model
module.exports = (CollectedGame) => {
    // Apply the isAuthenticated middleware to all routes in this file
    router.use(isAuthenticated);

    // Get User's Collection
    router.get('/', async (req, res) => {
        try {
            const userId = req.session.user.id;
            const userCollection = await CollectedGame.findAll({
                where: { userId: userId },
                order: [['createdAt', 'DESC']]
            });
            res.status(200).json(userCollection);
        } catch (error) {
            console.error('GET /collection: Server error ->', error);
            res.status(500).json({ error: 'Server error while fetching collection' });
        }
    });

    // Add Game to User's Collection
    router.post('/', async (req, res) => {
        try {
            const userId = req.session.user.id;
            const { gameId, gameTitle, gameImage, rating } = req.body;
            if (typeof gameId === 'undefined' || !gameTitle) {
                return res.status(400).json({ error: 'Bad Request: gameId and gameTitle are required' });
            }
            const [game, created] = await CollectedGame.findOrCreate({
                where: { userId: userId, rawgGameId: gameId },
                defaults: { userId, rawgGameId: parseInt(gameId), gameTitle, gameImage, rating }
            });
            const updatedCollection = await CollectedGame.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
            if (created) {
                res.status(201).json({ message: 'Game added to your collection!', collection: updatedCollection });
            } else {
                res.status(200).json({ message: 'Game is already in your collection', collection: updatedCollection });
            }
        } catch (error) {
            console.error('POST /collection: Server error ->', error);
            res.status(500).json({ error: 'Server error while adding game to collection' });
        }
    });

    // Remove Game from User's Collection
    router.delete('/:rawgGameId', async (req, res) => {
        try {
            const userId = req.session.user.id;
            const rawgGameIdToRemove = parseInt(req.params.rawgGameId);
            if (isNaN(rawgGameIdToRemove)) {
                return res.status(400).json({ error: 'Bad Request: Valid rawgGameId parameter is required' });
            }
            const result = await CollectedGame.destroy({
                where: { userId: userId, rawgGameId: rawgGameIdToRemove }
            });
            if (result > 0) {
                const updatedCollection = await CollectedGame.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
                res.status(200).json({ message: 'Game removed from collection', collection: updatedCollection });
            } else {
                const currentCollection = await CollectedGame.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
                res.status(404).json({ error: 'Game not found in collection', collection: currentCollection });
            }
        } catch (error) {
            console.error('DELETE /collection/:rawgGameId: Server error ->', error);
            res.status(500).json({ error: 'Server error while removing game from collection' });
        }
    });

    return router;
};