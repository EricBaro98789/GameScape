// search-app.js
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('gameSearchInput');
    const searchButton = document.getElementById('gameSearchButton');
    const resultsGrid = document.getElementById('gameResultsGrid');
    let gameDetailContainer = document.getElementById('gameDetailContainer');

    if (!gameDetailContainer) {
        gameDetailContainer = document.createElement('div');
        gameDetailContainer.id = 'gameDetailContainer';
        gameDetailContainer.style.display = 'none';
        resultsGrid.parentNode.insertBefore(gameDetailContainer, resultsGrid.nextSibling);
    }

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // VVVVVV DEFINE THE displayGames FUNCTION HERE VVVVVV
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    function displayGames(gamesArray) {
        resultsGrid.innerHTML = ''; // Clear previous results or "no games found" message

        if (gamesArray && gamesArray.length > 0) {
            gamesArray.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';

                gameCard.innerHTML = `
                    <img src="${game.background_image || 'assets/images/placeholder.jpg'}" alt="${game.name || 'Game image'}" />
                    <h4>${game.name}</h4>
                    <div class="platform-icons">🖥 🎮</div>
                    <div class="rating">⭐ ${game.rating || 'N/A'}</div>
                    <button class="view-details-btn" data-game-id="${game.id}">View Details</button>
                `;
                resultsGrid.appendChild(gameCard);
            });
        } else {
            resultsGrid.innerHTML = '<p>No games to display.</p>';
        }
    }
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // ^^^^^^ END OF displayGames FUNCTION DEFINITION ^^^^^^
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    async function performSearch() {
        const searchTerm = searchInput.value.trim();

        if (!searchTerm) {
            resultsGrid.style.display = 'grid'; // Ensure grid is visible for message
            gameDetailContainer.style.display = 'none';
            displayGames([]); // Call with empty array to show "No games to display" or clear
            resultsGrid.innerHTML = '<p>Please enter a game name to search.</p>'; // Or keep specific message
            return;
        }

        resultsGrid.innerHTML = '<p>Loading results...</p>';
        resultsGrid.style.display = 'grid';
        gameDetailContainer.style.display = 'none';

        try {
            // Make sure YOUR_BACKEND_PORT is correctly set, e.g., 8080
            const apiUrl = `http://localhost:8080/api/games/search?query=${encodeURIComponent(searchTerm)}`;

            // Corrected typo in your log: "Workspaceing" to "Fetching"
            console.log(`Workspaceing from: ${apiUrl}`);
            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from server.' }));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('Data received:', data);

            // NOW CALL THE SEPARATE displayGames FUNCTION
            displayGames(data.results);

        } catch (error) {
            console.error('Error during search:', error);
            resultsGrid.innerHTML = `<p>An error occurred: ${error.message}. Please check the console.</p>`;
        }
    }

    // Event listener for "Enter" key press
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            performSearch();
        }
    });

    // Event listener for search button click
    searchButton.addEventListener('click', performSearch);

    // Event listener for "View Details" buttons
    resultsGrid.addEventListener('click', async (event) => {
        if (event.target && event.target.classList.contains('view-details-btn')) {
            const gameId = event.target.dataset.gameId;
            if (gameId) {
                console.log(`View Details clicked for game ID: ${gameId}`);
                await fetchAndDisplayGameDetails(gameId);
            }
        }
    });

    // Function to fetch and display specific game details
    async function fetchAndDisplayGameDetails(gameId) {
        resultsGrid.style.display = 'none';
        gameDetailContainer.innerHTML = '<p>Loading game details...</p>';
        gameDetailContainer.style.display = 'block';

        try {
            // Make sure YOUR_BACKEND_PORT is correctly set, e.g., 8080
            const apiUrl = `http://localhost:8080/api/games/${gameId}`;
            // Corrected typo in your log: "Workspaceing" to "Fetching"
            console.log(`Workspaceing details from: ${apiUrl}`);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from server.'}));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }
            const gameDetails = await response.json();
            console.log('Game details received:', gameDetails);

            gameDetailContainer.innerHTML = `
                <button id="backToSearchBtn" style="margin-bottom: 15px;">Back to Search Results</button>
                <h2>${gameDetails.name}</h2>
                <img src="${gameDetails.background_image || 'assets/images/placeholder.jpg'}" alt="${gameDetails.name || 'Game image'}" style="max-width: 100%; max-height: 400px; object-fit: cover; border-radius: 5px; margin-bottom: 15px;"/>
                <p><strong>Rating:</strong> ${gameDetails.rating || 'N/A'} (Metacritic: ${gameDetails.metacritic || 'N/A'})</p>
                <p><strong>Released:</strong> ${gameDetails.released || 'N/A'}</p>
                <div><strong>Description:</strong> ${gameDetails.description_raw || gameDetails.description || 'No description available.'}</div>
                <p><strong>Platforms:</strong> ${gameDetails.platforms ? gameDetails.platforms.map(p => p.platform.name).join(', ') : 'N/A'}</p>
                <p><strong>Genres:</strong> ${gameDetails.genres ? gameDetails.genres.map(g => g.name).join(', ') : 'N/A'}</p>
                <p><strong>Developers:</strong> ${gameDetails.developers ? gameDetails.developers.map(d => d.name).join(', ') : 'N/A'}</p>
                <p><strong>Publishers:</strong> ${gameDetails.publishers ? gameDetails.publishers.map(p => p.name).join(', ') : 'N/A'}</p>
                ${gameDetails.website ? `<p><a href="${gameDetails.website}" target="_blank" rel="noopener noreferrer">Visit Website</a></p>` : ''}
            `;

            const backButton = document.getElementById('backToSearchBtn');
            if (backButton) {
                backButton.addEventListener('click', () => {
                    gameDetailContainer.style.display = 'none';
                    resultsGrid.style.display = 'grid';
                    gameDetailContainer.innerHTML = '';
                });
            }
        } catch (error) {
            console.error('Error fetching game details:', error);
            gameDetailContainer.innerHTML = `<p>Failed to load game details: ${error.message}. Please check the console.</p>
                                           <button id="backToSearchOnErrorBtn">Back to Search</button>`;
            const backOnErrorButton = document.getElementById('backToSearchOnErrorBtn');
            if(backOnErrorButton){
                backOnErrorButton.addEventListener('click', () => {
                    gameDetailContainer.style.display = 'none';
                    resultsGrid.style.display = 'grid';
                    gameDetailContainer.innerHTML = '';
                });
            }
        }
    }

    // Function to load a specific game or a predefined set on page load
    async function loadInitialGames() {
        const initialGameSearchTerm = "grand theft auto 6"; // Or any game you want to feature
        resultsGrid.innerHTML = `<p>Loading featured game: ${initialGameSearchTerm}...</p>`;
        resultsGrid.style.display = 'grid';
        gameDetailContainer.style.display = 'none';

        try {
            // Make sure YOUR_BACKEND_PORT is correctly set, e.g., 8080
            const apiUrl = `http://localhost:8080/api/games/search?query=${encodeURIComponent(initialGameSearchTerm)}&page_size=5`;

            console.log(`Workspaceing initial game from: ${apiUrl}`); // Corrected "Workspaceing"
            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from server.' }));
                throw new Error(`Server error for initial game: ${response.status} - ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('Initial game data received:', data);

            if (data.results && data.results.length > 0) {
                // VVVVVV CORRECTED LINE VVVVVV
                displayGames(data.results);
                // ^^^^^^ CORRECTED LINE ^^^^^^
            } else {
                resultsGrid.innerHTML = `<p>Could not load featured game: ${initialGameSearchTerm}.</p>`;
            }
        } catch (error) {
            console.error('Error loading initial game:', error);
            resultsGrid.innerHTML = `<p>An error occurred loading the initial game: ${error.message}.</p>`;
        }
    }

    // CALL loadInitialGames when the page loads
    loadInitialGames();
});