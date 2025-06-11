// Frontend/assets/js/search.js (with Session Authentication)

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const searchInput = document.getElementById('gameSearchInput');
    const searchButton = document.getElementById('gameSearchButton');
    const resultsGrid = document.getElementById('gameResultsGrid');
    let gameDetailContainer = document.getElementById('gameDetailContainer');
    let myCollectionContainer = document.getElementById('myCollectionContainer');
    const loadCollectionButton = document.getElementById('loadCollectionBtn');
    const logoutButton = document.getElementById('logoutBtn'); // Assumes you have a button with id="logoutBtn"
    const loggedInStatus = document.getElementById('loggedInStatus'); // Assumes a div with this id
    const themeToggleButton = document.getElementById('themeToggle');
    // +++ NEW: References for export buttons +++
    const exportButtonsContainer = document.querySelector('.export-buttons');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    // --- State Variable for View Management ---
    let currentListView = 'search'; // Tracks if the last list view was 'search' or 'collection'
    // +++ NEW: Variable to hold collection data for exporting +++
    let currentUserCollection = [];

    // --- Dynamic Container Creation ---
    if (!gameDetailContainer) {
        gameDetailContainer = document.createElement('div');
        gameDetailContainer.id = 'gameDetailContainer';
        gameDetailContainer.style.display = 'none';
        resultsGrid.parentNode.insertBefore(gameDetailContainer, resultsGrid.nextSibling);
    }
    if (!myCollectionContainer) {
        myCollectionContainer = document.createElement('div');
        myCollectionContainer.id = 'myCollectionContainer';
        myCollectionContainer.className = 'game-grid';
        myCollectionContainer.style.display = 'none';
        (gameDetailContainer.nextSibling ?
            gameDetailContainer.parentNode.insertBefore(myCollectionContainer, gameDetailContainer.nextSibling) :
            resultsGrid.parentNode.insertBefore(myCollectionContainer, resultsGrid.nextSibling)
        );
    }

    // --- Event Listeners Setup ---
    if (searchButton) searchButton.addEventListener('click', performSearch);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
    if (loadCollectionButton) loadCollectionButton.addEventListener('click', loadAndDisplayUserCollection);
    if (logoutButton) logoutButton.addEventListener('click', logoutUser);

    if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
    // +++ NEW: Event listeners for export buttons +++
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportAsJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportAsCSV);

    resultsGrid.addEventListener('click', (event) => handleCardClick(event));
    myCollectionContainer.addEventListener('click', (event) => handleCardClick(event));

    // --- Theme Toggle Logic (Moved from HTML) ---
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }
    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }

    // --- Core Functions ---

    async function handleCardClick(event) {
        const target = event.target;
        if (target.classList.contains('view-details-btn')) {
            await fetchAndDisplayGameDetails(target.dataset.gameId);
        } else if (target.classList.contains('add-to-collection-btn')) {
            await addToUserCollection({
                gameId: parseInt(target.dataset.gameId),
                gameTitle: decodeURIComponent(target.dataset.gameTitle),
                gameImage: decodeURIComponent(target.dataset.gameImage),
                rating: target.dataset.gameRating ? parseFloat(target.dataset.gameRating) : null
            }, target);
        } else if (target.classList.contains('remove-from-collection-btn')) {
            await removeFromUserCollection(target.dataset.gameId);
        }
    }


    function displayGames(gamesArray, isUserCollection = false) {
        const containerToUse = isUserCollection ? myCollectionContainer : resultsGrid;
        containerToUse.innerHTML = '';

        // Manage visibility of main content areas
        currentListView = isUserCollection ? 'collection' : 'search';
        resultsGrid.style.display = isUserCollection ? 'none' : 'grid';
        myCollectionContainer.style.display = isUserCollection ? 'grid' : 'none';
        gameDetailContainer.style.display = 'none';

        // +++ NEW: Show export buttons only when viewing the collection +++
        exportButtonsContainer.style.display = isUserCollection ? 'block' : 'none';

        if (!gamesArray || gamesArray.length === 0) {
            containerToUse.innerHTML = isUserCollection ?
                '<p>Your collection is empty. Search for games to add them!</p>' :
                '<p>No games found for this search.</p>';
            return;
        }

        gamesArray.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            const gameId = isUserCollection ? game.rawgGameId : game.id;
            const gameName = isUserCollection ? game.gameTitle : game.name;
            const gameImage = isUserCollection ? (game.gameImage || 'assets/images/placeholder.jpg') : (game.background_image || 'assets/images/placeholder.jpg');
            const ratingValue = game.rating;

            let buttonsHtml = `<button class="view-details-btn" data-game-id="${gameId}">View Details</button>`;
            if (!isUserCollection) {
                buttonsHtml += ` <button class="add-to-collection-btn" data-game-id="${gameId}" data-game-title="${encodeURIComponent(gameName)}" data-game-image="${encodeURIComponent(gameImage || '')}" data-game-rating="${ratingValue || ''}">Add to Collection</button>`;
            } else {
                buttonsHtml += ` <button class="remove-from-collection-btn" data-game-id="${gameId}">Remove</button>`;
            }
            const ratingToShow = (typeof ratingValue === 'number') ? ratingValue.toFixed(1) : 'N/A';

            gameCard.innerHTML = `
                <img src="${gameImage}" alt="${gameName}" />
                <h4>${gameName}</h4>
                <div class="rating">⭐ ${ratingToShow}</div>
                ${buttonsHtml}
            `;
            containerToUse.appendChild(gameCard);
        });
    }


async function fetchAndDisplayGameDetails(gameId) {
    if (!gameId) return;
    userHasTakenAction = true; // Mark that the user has taken an action

    // Hide other views and show this one with a loading message
    resultsGrid.style.display = 'none';
    myCollectionContainer.style.display = 'none';
    gameDetailContainer.innerHTML = '<p>Loading details...</p>';
    gameDetailContainer.style.display = 'block';

    try {
        // Fetch the detailed game data from your backend
        const apiUrl = `http://localhost:8080/api/games/${gameId}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch game details');
        const details = await response.json();

        // New, improved HTML structure with CSS classes for styling
        gameDetailContainer.innerHTML = `
            <div class="game-detail-view">
                <button id="backBtn" class="back-button">&larr; Back to List</button>
                <div class="detail-header">
                    <h1>${details.name}</h1>
                    <div class="detail-rating">⭐ ${details.rating || 'N/A'}</div>
                </div>
                <div class="detail-main-content">
                    <img class="detail-image" src="${details.background_image || 'assets/images/placeholder.jpg'}" alt="${details.name}">
                    <div class="detail-info">
                        <p><strong>Released:</strong> ${details.released || 'N/A'}</p>
                        <p><strong>Genres:</strong> ${details.genres ? details.genres.map(g => g.name).join(', ') : 'N/A'}</p>
                        <p><strong>Platforms:</strong> ${details.platforms ? details.platforms.map(p => p.platform.name).join(', ') : 'N/A'}</p>
                        <p><strong>Developers:</strong> ${details.developers ? details.developers.map(d => d.name).join(', ') : 'N/A'}</p>
                        ${details.website ? `<p><strong>Website:</strong> <a href="${details.website}" target="_blank" rel="noopener noreferrer">${details.website}</a></p>` : ''}
                    </div>
                </div>
                <div class="detail-description">
                    <h3>Description</h3>
                    <p>${details.description_raw || 'No description available.'}</p>
                </div>
            </div>
        `;

        // Add the event listener for the new back button
        document.getElementById('backBtn').addEventListener('click', () => {
            userHasTakenAction = true;
            gameDetailContainer.style.display = 'none';
            // Return to the correct previous view
            if (currentListView === 'collection') {
                myCollectionContainer.style.display = 'grid';
            } else {
                resultsGrid.style.display = 'grid';
            }
        });
    } catch (error) {
        console.error("Error fetching details:", error);
        gameDetailContainer.innerHTML = `<p>Error loading details. Please try again.</p><button id="backBtnError">Back</button>`;
        document.getElementById('backBtnError')?.addEventListener('click', () => {
            gameDetailContainer.style.display = 'none';
            resultsGrid.style.display = 'grid';
        });
    }
}

    // --- Authenticated Functions (Using Session Cookies) ---

    async function addToUserCollection(gameData, buttonElement) {
        // Check if user is logged in by looking for username in localStorage
        if (!localStorage.getItem("username")) {
            alert("Please log in to add games to your collection.");
            window.location.href = 'login.html';
            return;
        }
        try {
            const response = await fetch(`http://localhost:8080/collection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(gameData),
                credentials: 'include' // REQUIRED for session cookies
            });
            const result = await response.json();
            if (response.ok) {
                console.log(result.message || "Game added!"); // Log success instead of alert
                if (buttonElement) {
                    buttonElement.textContent = 'Collected ✔';
                    buttonElement.disabled = true;
                }
            } else {
                alert(`Failed to add game: ${result.error}`); // Alert on failure
            }
        } catch (error) {
            console.error("Error adding to collection:", error);
            alert("An error occurred. Please check your connection.");
        }
    }

    async function loadAndDisplayUserCollection() {
        if (!localStorage.getItem("username")) {
            alert("Please log in to view your collection.");
            window.location.href = 'login.html';
            return;
        }

        myCollectionContainer.innerHTML = '<p>Loading your collection...</p>';
        try {
            const response = await fetch(`http://localhost:8080/collection`, {
                method: "GET",
                credentials: 'include' // REQUIRED for session cookies
            });
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error || 'Failed to load collection');
            }
            const userCollection = await response.json();

            // +++ NEW: Store collection data for export +++
            currentUserCollection = userCollection;

            displayGames(userCollection, true);
        } catch (error) {
            console.error("Error loading collection:", error);
            myCollectionContainer.innerHTML = `<p>${error.message}</p>`;
        }
    }

    // +++ NEW: Export Functions (Moved from HTML and Corrected) +++
    function downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function exportAsJSON() {
        if (currentUserCollection.length === 0) {
            alert("Your collection is empty. Nothing to export.");
            return;
        }
        // Create a cleaner version of the data for export
        const dataToExport = currentUserCollection.map(game => ({
            rawgId: game.rawgGameId,
            title: game.gameTitle,
            rating: game.rating,
            imageUrl: game.gameImage,
            dateAdded: game.createdAt
        }));

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        downloadFile(url, 'my-game-collection.json');
    }

    function exportAsCSV() {
        if (currentUserCollection.length === 0) {
            alert("Your collection is empty. Nothing to export.");
            return;
        }
        const headers = '"RAWG ID","Title","Rating","Image URL","Date Added"';
        const rows = currentUserCollection.map(game => {
            const id = game.rawgGameId;
            // Handle commas in title by wrapping in quotes and escaping existing quotes
            const title = `"${(game.gameTitle || '').replace(/"/g, '""')}"`;
            const rating = game.rating || 'N/A';
            const imageUrl = `"${game.gameImage || ''}"`;
            const dateAdded = `"${new Date(game.createdAt).toLocaleDateString()}"`;
            return [id, title, rating, imageUrl, dateAdded].join(',');
        });

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        downloadFile(url, 'my-game-collection.csv');}

    async function removeFromUserCollection(rawgGameId) {
        if (!localStorage.getItem("username")) {
            alert("Please log in to modify your collection.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/collection/${rawgGameId}`, {
                method: "DELETE",
                credentials: 'include' // REQUIRED for session cookies
            });
            const result = await response.json();
            if (response.ok) {
                console.log(result.message || "Game removed.");
                loadAndDisplayUserCollection(); // Refresh collection view
            } else {
                alert(`Failed to remove game: ${result.error}`);
            }
        } catch (error) {
            console.error("Error removing from collection:", error);
            alert("An error occurred while removing the game.");
        }
    }

    async function logoutUser() {
        try {
            const response = await fetch('http://localhost:8080/logout', {
                method: 'POST',
                credentials: 'include' // REQUIRED for session cookies
            });
            const result = await response.json();
            if(response.ok) {
                localStorage.removeItem("username");
                alert(result.message);
                window.location.href = 'login.html';
            } else {
                alert(`Logout failed: ${result.message}`);
            }
        } catch (error) {
            alert("Error logging out.");
        }
    }

    // --- UI and Page Load Functions ---

    function checkLoginStatus() {
        const username = localStorage.getItem("username");
        if (username) {
            if (loggedInStatus) {
                loggedInStatus.textContent = `Welcome, ${username}`;
                loggedInStatus.style.display = 'inline';
            }
            if(logoutButton) logoutButton.style.display = 'inline-block';
        } else {
             if (logoutButton) logoutButton.style.display = 'none';
             if (loggedInStatus) loggedInStatus.style.display = 'none';
        }
    }

    async function performSearch() {
        currentListView = 'search'; // Set view state
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            resultsGrid.innerHTML = '<p>Please enter a game name to search.</p>';
            return;
        }
        resultsGrid.innerHTML = '<p>Searching...</p>';
        myCollectionContainer.style.display = 'none';
        gameDetailContainer.style.display = 'none';
        resultsGrid.style.display = 'grid';
        try {
            const apiUrl = `http://localhost:8080/api/games/search?query=${encodeURIComponent(searchTerm)}`;
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Search request failed');
            const data = await response.json();
            displayGames(data.results, false);
        } catch (error) {
            console.error('Error during search:', error);
            resultsGrid.innerHTML = `<p>An error occurred during search.</p>`;
        }
    }



    // --- Initial Actions on Page Load ---
    applySavedTheme();
    checkLoginStatus();
});
