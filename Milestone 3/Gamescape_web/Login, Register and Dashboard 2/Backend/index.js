var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

//Dark/Light Mode toggle button
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const currentTheme = localStorage.getItem('theme');

  // Restore theme on first load
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');

    // Record user selection
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
});

