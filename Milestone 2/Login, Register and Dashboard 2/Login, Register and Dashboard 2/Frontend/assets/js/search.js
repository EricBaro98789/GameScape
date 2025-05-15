// search-app.js
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('gameSearchInput');
    const searchButton = document.getElementById('gameSearchButton'); // Assuming you added this button
    const resultsGrid = document.getElementById('gameResultsGrid');

    // +++ START: ADDITION 1 - Get or create a container for game details +++
    let gameDetailContainer = document.getElementById('gameDetailContainer');
    if (!gameDetailContainer) {
        gameDetailContainer = document.createElement('div');
        gameDetailContainer.id = 'gameDetailContainer';
        gameDetailContainer.style.display = 'none'; // Initially hidden
        // Insert it after the resultsGrid in the DOM, or choose another appropriate place
        resultsGrid.parentNode.insertBefore(gameDetailContainer, resultsGrid.nextSibling);
    }
    // +++ END: ADDITION 1 +++

    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if it's in a form
            performSearch();
        }
    });

    searchButton.addEventListener('click', performSearch);

    async function performSearch() {
        const searchTerm = searchInput.value.trim();

        if (!searchTerm) {
            resultsGrid.innerHTML = '<p>Please enter a game name to search.</p>';
            return;
        }

        resultsGrid.innerHTML = '<p>Loading results...</p>'; // Provide loading feedback

        try {
            const apiUrl = `http://localhost:8080/api/games/search?query=${encodeURIComponent(searchTerm)}`;

            console.log(`Workspaceing from: ${apiUrl}`);
            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from server.' }));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('Data received:', data);

            resultsGrid.innerHTML = ''; // Clear loading message

            if (data.results && data.results.length > 0) {
                data.results.forEach(game => {
                    const gameCard = document.createElement('div');
                    gameCard.className = 'game-card'; // Use the class from your HTML example

                    // Match the structure of your example game card
                    gameCard.innerHTML = `
                        <img src="${game.background_image || 'placeholder.jpg'}" alt="${game.name}" />
                        <h4>${game.name}</h4>
                        <div class="platform-icons">🖥 🎮</div> <div class="rating">⭐ ${game.rating || 'N/A'}</div>
                        <button class="view-details-btn" data-game-id="${game.id}">View Details</button>
                    `;
                    // Note: Added a class "view-details-btn" and "data-game-id" for potential future use.
                    // The "View Details" button won't do anything yet.
                    // Platform icons are static for now. You'd need to map game.platforms from RAWG.

                    resultsGrid.appendChild(gameCard);
                });
            } else {
                resultsGrid.innerHTML = '<p>No games found matching your search.</p>';
            }

        } catch (error) {
            console.error('Error during search:', error);
            resultsGrid.innerHTML = `<p>An error occurred: ${error.message}. Please check the console.</p>`;
        }
    }

     // +++ START: ADDITION 2 - Event listener for clicks on dynamically added "View Details" buttons +++
    resultsGrid.addEventListener('click', async (event) => {
        // Check if the clicked element is a 'view-details-btn'
        if (event.target && event.target.classList.contains('view-details-btn')) {
            const gameId = event.target.dataset.gameId; // Get game ID from data-game-id attribute
            if (gameId) {
                console.log(`View Details clicked for game ID: ${gameId}`);
                await fetchAndDisplayGameDetails(gameId);
            }
        }
    });
    // +++ END: ADDITION 2 +++

        // +++ START: ADDITION 3 - Function to fetch and display specific game details +++
    async function fetchAndDisplayGameDetails(gameId) {
        resultsGrid.style.display = 'none'; // Hide the search results grid
        gameDetailContainer.innerHTML = '<p>Loading game details...</p>';
        gameDetailContainer.style.display = 'block'; // Show the detail container

        try {
            // !!! IMPORTANT: Replace YOUR_BACKEND_PORT with your actual backend port !!!
            const apiUrl = `http://localhost:8080/api/games/${gameId}`;
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
                <img src="${gameDetails.background_image || 'placeholder.jpg'}" alt="${gameDetails.name || 'Game image'}" style="max-width: 100%; max-height: 400px; object-fit: cover; border-radius: 5px; margin-bottom: 15px;"/>
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
                    resultsGrid.style.display = 'grid'; // Or whatever its original display was, 'grid' if using the CSS from before
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
    // +++ END: ADDITION 3 +++

});