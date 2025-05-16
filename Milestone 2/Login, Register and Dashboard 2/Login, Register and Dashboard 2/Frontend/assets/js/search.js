// Frontend/assets/js/search.js
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('gameSearchInput');
    const searchButton = document.getElementById('gameSearchButton');
    const resultsGrid = document.getElementById('gameResultsGrid');
    let gameDetailContainer = document.getElementById('gameDetailContainer');
    let myCollectionContainer = document.getElementById('myCollectionContainer');
    const loadCollectionButton = document.getElementById('loadCollectionBtn');

    // Dynamically create containers if they don't exist in HTML
    if (!gameDetailContainer) {
        gameDetailContainer = document.createElement('div');
        gameDetailContainer.id = 'gameDetailContainer';
        gameDetailContainer.style.display = 'none';
        resultsGrid.parentNode.insertBefore(gameDetailContainer, resultsGrid.nextSibling);
    }
    if (!myCollectionContainer) {
        myCollectionContainer = document.createElement('div');
        myCollectionContainer.id = 'myCollectionContainer';
        myCollectionContainer.className = 'game-grid'; // Apply same styling as results
        myCollectionContainer.style.display = 'none';
        (gameDetailContainer.nextSibling ?
            gameDetailContainer.parentNode.insertBefore(myCollectionContainer, gameDetailContainer.nextSibling) :
            resultsGrid.parentNode.insertBefore(myCollectionContainer, resultsGrid.nextSibling)
        );
    }

    // --- Event Listeners ---
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                performSearch();
            }
        });
    }
    if (loadCollectionButton) {
        loadCollectionButton.addEventListener('click', loadAndDisplayUserCollection);
    }

    // Event delegation for dynamically created buttons in search results
    resultsGrid.addEventListener('click', async (event) => {
        const target = event.target;
        if (target && target.classList.contains('view-details-btn')) {
            const gameId = target.dataset.gameId;
            if (gameId) await fetchAndDisplayGameDetails(gameId);
        } else if (target && target.classList.contains('add-to-collection-btn')) {
            const gameId = target.dataset.gameId;
            const gameTitle = decodeURIComponent(target.dataset.gameTitle);
            const gameImage = decodeURIComponent(target.dataset.gameImage);
            const gameRating = target.dataset.gameRating; // Get rating

            if (gameId && gameTitle) {
                await addToUserCollection({
                    gameId: parseInt(gameId),
                    gameTitle,
                    gameImage: gameImage || null,
                    rating: gameRating ? parseFloat(gameRating) : null // Pass rating
                }, target);
            }
        }
    });

    // Event delegation for dynamically created buttons in collection view
    myCollectionContainer.addEventListener('click', async (event) => {
        const target = event.target;
        if (target && target.classList.contains('view-details-btn')) {
            const gameId = target.dataset.gameId; // This should be rawgGameId
            if (gameId) await fetchAndDisplayGameDetails(gameId);
        } else if (target && target.classList.contains('remove-from-collection-btn')) {
            const gameId = target.dataset.gameId; // This should be rawgGameId
            if (gameId) {
                await removeFromUserCollection(gameId);
            }
        }
    });

    // --- Core Functions ---

    function displayGames(gamesArray, isUserCollection = false) {
        const containerToUse = isUserCollection ? myCollectionContainer : resultsGrid;
        containerToUse.innerHTML = ''; // Clear the specific container

        // Manage visibility of main content areas
        if (isUserCollection) {
            resultsGrid.style.display = 'none';
            gameDetailContainer.style.display = 'none';
            containerToUse.style.display = 'grid'; // Or 'block'
        } else { // Displaying search results (or initial load)
            myCollectionContainer.style.display = 'none';
            gameDetailContainer.style.display = 'none';
            containerToUse.style.display = 'grid'; // Or 'block'
        }

        if (gamesArray && gamesArray.length > 0) {
            gamesArray.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';

                let gameIdForButton, gameNameToDisplay, gameImageToDisplay, ratingValue;

                if (isUserCollection) {
                    // Data from your backend's /collection GET route (CollectedGame model)
                    gameIdForButton = game.rawgGameId;
                    gameNameToDisplay = game.gameTitle;
                    gameImageToDisplay = game.gameImage || 'assets/images/placeholder.jpg';
                    ratingValue = game.rating; // Rating is now stored in the collection
                    console.log('Displaying COLLECTED game card:', { title: gameNameToDisplay, rawgIdForButton: gameIdForButton, rating: ratingValue });
                } else {
                    // Data from RAWG search API
                    gameIdForButton = game.id;
                    gameNameToDisplay = game.name;
                    gameImageToDisplay = game.background_image || 'assets/images/placeholder.jpg';
                    ratingValue = game.rating; // Rating from RAWG
                }

                let buttonsHtml = `<button class="view-details-btn" data-game-id="${gameIdForButton}">View Details</button>`;
                if (!isUserCollection) {
                    buttonsHtml += ` <button class="add-to-collection-btn"
                                            data-game-id="${gameIdForButton}"
                                            data-game-title="${encodeURIComponent(gameNameToDisplay)}"
                                            data-game-image="${encodeURIComponent(gameImageToDisplay)}"
                                            data-game-rating="${ratingValue || ''}">Add to Collection</button>`;
                } else {
                    buttonsHtml += ` <button class="remove-from-collection-btn" data-game-id="${gameIdForButton}">Remove</button>`;
                }

                const ratingToShow = (typeof ratingValue === 'number') ? ratingValue.toFixed(1) : 'N/A';


                gameCard.innerHTML = `
                    <img src="${gameImageToDisplay}" alt="${gameNameToDisplay}" />
                    <h4>${gameNameToDisplay}</h4>
                    <div class="platform-icons">🖥 🎮</div> <div class="rating">⭐ ${ratingToShow}</div>
                    ${buttonsHtml}
                `;
                containerToUse.appendChild(gameCard);
            });
        } else {
            containerToUse.innerHTML = isUserCollection ?
                '<p>Your collection is empty. Search for games to add them!</p>' :
                '<p>No games found for this search.</p>';
        }
    }

    async function performSearchActual(searchTerm, isInitialLoad = false) {
        if (!isInitialLoad) {
            resultsGrid.style.display = 'grid';
            gameDetailContainer.style.display = 'none';
            myCollectionContainer.style.display = 'none';
        } else {
             resultsGrid.style.display = 'grid';
             gameDetailContainer.style.display = 'none';
             myCollectionContainer.style.display = 'none';
        }

        try {
            const pageSize = isInitialLoad ? 5 : 10;
            // !!! REPLACE 8080 with your actual backend port if different !!!
            const apiUrl = `http://localhost:8080/api/games/search?query=${encodeURIComponent(searchTerm)}&page_size=${pageSize}`;
            console.log(`Fetching from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response.' }));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }
            const data = await response.json();
            console.log('Data received for search/initial:', data);
            displayGames(data.results, false);
        } catch (error) {
            console.error(`Error during ${isInitialLoad ? 'initial load' : 'search'}:`, error);
            resultsGrid.innerHTML = `<p>An error occurred: ${error.message}.</p>`;
        }
    }

    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            resultsGrid.style.display = 'grid';
            gameDetailContainer.style.display = 'none';
            myCollectionContainer.style.display = 'none';
            displayGames([], false); // Clear results and show "No games to display"
            resultsGrid.innerHTML = '<p>Please enter a game name to search.</p>';
            return;
        }
        resultsGrid.innerHTML = '<p>Searching for results...</p>';
        await performSearchActual(searchTerm, false);
    }

    async function fetchAndDisplayGameDetails(gameId) {
        resultsGrid.style.display = 'none';
        myCollectionContainer.style.display = 'none';
        gameDetailContainer.innerHTML = '<p>Loading game details...</p>';
        gameDetailContainer.style.display = 'block';

        try {
            // !!! REPLACE 8080 with your actual backend port if different !!!
            const apiUrl = `http://localhost:8080/api/games/${gameId}`;
            console.log(`Fetching details from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from server.' }));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }
            const gameDetails = await response.json();
            console.log('Game details received:', gameDetails);

            gameDetailContainer.innerHTML = `
                <button id="backToMainViewBtn" style="margin-bottom: 15px;">Back to Results</button>
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
            document.getElementById('backToMainViewBtn').addEventListener('click', () => {
                gameDetailContainer.style.display = 'none';
                // Check localStorage or a variable to see if user was viewing collection or search
                // For simplicity, always go back to search results view for now
                resultsGrid.style.display = 'grid';
                myCollectionContainer.style.display = 'none'; // Ensure collection is hidden
            });
        } catch (error) {
            console.error('Error fetching game details:', error);
            gameDetailContainer.innerHTML = `<p>Failed to load game details: ${error.message}.</p>
                                           <button id="backToMainViewOnErrorBtn">Back to Results</button>`;
            document.getElementById('backToMainViewOnErrorBtn')?.addEventListener('click', () => {
                gameDetailContainer.style.display = 'none';
                resultsGrid.style.display = 'grid';
            });
        }
    }

    async function addToUserCollection(gameData, buttonElement) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to add games to your collection.");
            return;
        }
        console.log("Adding to collection with data:", gameData); // Will include rating
        try {
            // !!! REPLACE 8080 with your actual backend port if different !!!
            const response = await fetch(`http://localhost:8080/collection`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(gameData)
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || "Game added to collection!");
                if (buttonElement) {
                    buttonElement.textContent = 'Collected ✔';
                    buttonElement.disabled = true;
                }
            } else {
                alert(`Failed to add to collection: ${result.error || 'Unknown server error'}`);
            }
        } catch (error) {
            console.error("Error adding to collection:", error);
            alert("An error occurred while adding to your collection. Please try again.");
        }
    }

    async function loadAndDisplayUserCollection() {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to view your collection.");
            return;
        }
        resultsGrid.style.display = 'none';
        gameDetailContainer.style.display = 'none';
        myCollectionContainer.innerHTML = '<p>Loading your collection...</p>';
        myCollectionContainer.style.display = 'grid';

        try {
            // !!! REPLACE 8080 with your actual backend port if different !!!
            const response = await fetch(`http://localhost:8080/collection`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from server.' }));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }
            const userCollection = await response.json();
            console.log("User collection received:", userCollection);
            displayGames(userCollection, true); // Pass true for isUserCollection
        } catch (error) {
            console.error("Error loading collection:", error);
            myCollectionContainer.innerHTML = `<p>Failed to load your collection: ${error.message}</p>
                                             <button id="backToSearchFromCollErrorBtn">Back to Search</button>`;
            document.getElementById('backToSearchFromCollErrorBtn')?.addEventListener('click', () => {
                myCollectionContainer.style.display = 'none';
                resultsGrid.style.display = 'grid';
            });
        }
    }

    async function removeFromUserCollection(rawgGameId) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to modify your collection.");
            return;
        }
        if (!confirm("Are you sure you want to remove this game from your collection?")) {
            return;
        }
        console.log(`Attempting to remove game with rawgGameId: ${rawgGameId} from collection.`);
        try {
            // !!! REPLACE 8080 with your actual backend port if different !!!
            const response = await fetch(`http://localhost:8080/collection/${rawgGameId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || "Game removed successfully!");
                displayGames(result.collection, true); // Refresh collection view
            } else {
                alert(`Failed to remove game: ${result.error || 'Unknown server error'}`);
            }
        } catch (error) {
            console.error("Error removing from collection:", error);
            alert("An error occurred while removing the game. Please try again.");
        }
    }


    async function loadInitialGames() {
        const initialGameSearchTerm = "grand theft auto 6"; // Example
        resultsGrid.innerHTML = `<p>Loading featured game(s)...</p>`;
        await performSearchActual(initialGameSearchTerm, true);
    }

    loadInitialGames(); // Load initial games when DOM is ready
});
