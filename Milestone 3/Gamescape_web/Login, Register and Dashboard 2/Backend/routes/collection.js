const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthenticated.js');

module.exports = (CollectedGame) => {
    router.use(isAuthenticated); // Protect all routes in this file

    router.get('/', async (req, res) => {
        try {
            const userCollection = await CollectedGame.findAll({ where: { userId: req.session.user.id }, order: [['createdAt', 'DESC']] });
            res.json(userCollection);
        } catch (error) {
            res.status(500).json({ error: 'Server error while fetching collection' });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { gameId, gameTitle, gameImage, rating } = req.body;
            await CollectedGame.findOrCreate({
                where: { userId: req.session.user.id, rawgGameId: gameId },
        defaults: { userId: req.session.user.id, rawgGameId: gameId, gameTitle, gameImage, rating }
            });
            res.status(201).json({ message: 'Game added/found in collection.' });
        } catch (error) {
            res.status(500).json({ error: 'Server error while adding to collection' });
        }
    });

    router.delete('/:rawgGameId', async (req, res) => {
        try {
            const { rawgGameId } = req.params;
const result = await CollectedGame.destroy({ where: { userId: req.session.user.id, rawgGameId }});
            if (result > 0) {
                res.json({ message: 'Game removed from collection.' });
            } else {
                res.status(404).json({ error: 'Game not found in collection.' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Server error while removing from collection' });
        }
    });

    return router;
};