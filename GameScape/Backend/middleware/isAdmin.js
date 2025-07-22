module.exports = (req, res, next) => {
    // This middleware should always run AFTER isAuthenticated
    if (req.session.user && req.session.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
};


