document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('gameSearchInput');
    const searchButton = document.getElementById('gameSearchButton');
    const resultsGrid = document.getElementById('gameResultsGrid');
    let gameDetailContainer = document.getElementById('gameDetailContainer');

    // --- Get/Create containers for details and collection ---
    if (!gameDetailContainer) {
        gameDetailContainer = document.createElement('div');
        gameDetailContainer.id = 'gameDetailContainer';
        gameDetailContainer.style.display = 'none';
        resultsGrid.parentNode.insertBefore(gameDetailContainer, resultsGrid.nextSibling);
    }

    // +++ NEW: Get/Create container for My Collection +++
    let myCollectionContainer = document.getElementById('myCollectionContainer');
    if (!myCollectionContainer) {
        myCollectionContainer = document.createElement('div');
        myCollectionContainer.id = 'myCollectionContainer';
        myCollectionContainer.style.display = 'none';
        // Assuming you want it after gameDetailContainer or resultsGrid
        (gameDetailContainer.nextSibling ?
            gameDetailContainer.parentNode.insertBefore(myCollectionContainer, gameDetailContainer.nextSibling) :
            resultsGrid.parentNode.insertBefore(myCollectionContainer, resultsGrid.nextSibling)
        );
    }

    // +++ NEW: Get reference to Load Collection button (assuming you add it to HTML) +++
    const loadCollectionButton = document.getElementById('loadCollectionBtn');
    if (loadCollectionButton) {
        loadCollectionButton.addEventListener('click', loadAndDisplayUserCollection);
    }
    // --- End of New Element References ---

    function displayGames(gamesArray, isUserCollection = false) { // Added isUserCollection flag
        resultsGrid.innerHTML = '';
        myCollectionContainer.innerHTML = ''; // Clear collection too if displaying search results

        const containerToUse = isUserCollection ? myCollectionContainer : resultsGrid;
        containerToUse.innerHTML = ''; // Clear the specific container

        if (gamesArray && gamesArray.length > 0) {
            gamesArray.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';

                // For "Add to Collection", we need game.id, game.name, game.background_image
                // For displaying collection, backend sends gameId, gameTitle, gameImage
                const gameId = game.id || game.gameId;
                const gameName = game.name || game.gameTitle;
                const gameImage = game.background_image || game.gameImage || 'assets/images/placeholder.jpg';

                let buttonsHtml = `<button class="view-details-btn" data-game-id="${gameId}">View Details</button>`;
                if (!isUserCollection) { // Only show "Add to Collection" for search results
                    buttonsHtml += ` <button class="add-to-collection-btn"
                                            data-game-id="${gameId}"
                                            data-game-title="${encodeURIComponent(gameName)}"
                                            data-game-image="${encodeURIComponent(gameImage)}">Add to Collection</button>`;
                } else {
                     buttonsHtml += ` <button class="remove-from-collection-btn" data-game-id="${gameId}">Remove</button>`; // Placeholder for remove
                }


                gameCard.innerHTML = `
                    <img src="${gameImage}" alt="${gameName}" />
                    <h4>${gameName}</h4>
                    <div class="platform-icons">🖥 🎮</div>
                    <div class="rating">⭐ ${game.rating || 'N/A'}</div>
                    ${buttonsHtml}
                `;
                containerToUse.appendChild(gameCard);
            });
        } else {
            if (isUserCollection) {
                containerToUse.innerHTML = '<p>Your collection is empty. Add some games!</p>';
            } else {
                containerToUse.innerHTML = '<p>No games to display.</p>';
            }
        }
        // Ensure correct container visibility
        resultsGrid.style.display = isUserCollection ? 'none' : 'grid';
        myCollectionContainer.style.display = isUserCollection ? 'grid' : 'none'; // Assuming collection also uses grid
        gameDetailContainer.style.display = 'none';
    }

    async function performSearch() {
        // ... (your existing performSearch function)
        // Ensure it calls displayGames(data.results, false);
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) { /* ... */ displayGames([], false); resultsGrid.innerHTML = '<p>Please enter a game name to search.</p>'; return; }
        resultsGrid.innerHTML = '<p>Searching...</p>';
        // ... (rest of try-catch)
        // In the try block, on success:
        // displayGames(data.results, false);
        // (Make sure your performSearch correctly calls displayGames with the false flag)
        // For brevity, I'm not pasting the whole performSearch, just ensure the call is:
        // displayGames(data.results, false); in the success part.
        // And also ensure views are managed:
        resultsGrid.style.display = 'grid';
        gameDetailContainer.style.display = 'none';
        myCollectionContainer.style.display = 'none';
        // ... (actual fetch and displayGames call as you have it)
        try {
            const apiUrl = `http://localhost:8080/api/games/search?query=${encodeURIComponent(searchTerm)}`;
            console.log(`Workspaceing from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) { /* ... error handling ... */ throw new Error('Failed search'); }
            const data = await response.json();
            displayGames(data.results, false);
        } catch (error) {
            console.error('Error during search:', error);
            resultsGrid.innerHTML = `<p>An error occurred: ${error.message}.</p>`;
        }
    }

    // Event listeners for search
    searchInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') performSearch(); });
    searchButton.addEventListener('click', performSearch);

    // Event Listener for "View Details" and "Add to Collection" using Event Delegation
    // Modified to handle both types of buttons within game cards
    resultsGrid.addEventListener('click', async (event) => {
        const target = event.target;
        if (target && target.classList.contains('view-details-btn')) {
            const gameId = target.dataset.gameId;
            if (gameId) await fetchAndDisplayGameDetails(gameId);
        } else if (target && target.classList.contains('add-to-collection-btn')) {
            const gameId = target.dataset.gameId;
            const gameTitle = decodeURIComponent(target.dataset.gameTitle);
            const gameImage = decodeURIComponent(target.dataset.gameImage);
            if (gameId && gameTitle && gameImage) {
                await addToUserCollection({ gameId: parseInt(gameId), gameTitle, gameImage }, target);
            }
        }
    });

    // If you add remove buttons to the collection view:
    if (myCollectionContainer) {
        myCollectionContainer.addEventListener('click', async (event) => {
            const target = event.target;
            if (target && target.classList.contains('view-details-btn')) { // Re-use view details
                const gameId = target.dataset.gameId;
                if (gameId) await fetchAndDisplayGameDetails(gameId);
            } else if (target && target.classList.contains('remove-from-collection-btn')) {
                // const gameId = target.dataset.gameId;
                // await removeFromUserCollection(gameId); // You'd need to implement this
                alert('Remove from collection - functionality to be added!');
            }
        });
    }


    async function fetchAndDisplayGameDetails(gameId) {
        // ... (your existing fetchAndDisplayGameDetails function)
        // Ensure it manages visibility:
        resultsGrid.style.display = 'none';
        myCollectionContainer.style.display = 'none';
        gameDetailContainer.style.display = 'block';
        // ... (rest of the function, including the back button logic)
        // Make sure back button shows resultsGrid and hides others.
        // E.g., backButton.addEventListener('click', () => {
        //    gameDetailContainer.style.display = 'none';
        //    resultsGrid.style.display = 'grid';
        //    myCollectionContainer.style.display = 'none';
        //    gameDetailContainer.innerHTML = '';
        // });
        // For brevity, I'm not pasting the whole function, just ensure view management.
        // The version you had before for fetchAndDisplayGameDetails was good.
        try {
            const apiUrl = `http://localhost:8080/api/games/${gameId}`;
            // ... (rest of fetch and display logic as you had)
            const response = await fetch(apiUrl);
            if(!response.ok) throw new Error("Failed to fetch details");
            const gameDetails = await response.json();
             gameDetailContainer.innerHTML = `
                <button id="backToSearchBtnFromDetails" style="margin-bottom: 15px;">Back to Results</button>
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
            document.getElementById('backToSearchBtnFromDetails').addEventListener('click', () => {
                gameDetailContainer.style.display = 'none';
                resultsGrid.style.display = 'grid'; // Or 'block' or how it was
                // myCollectionContainer should already be none
            });

        } catch (error) { /* ... error handling ... */ }
    }

    // +++ NEW: Function to Add a Game to User's Collection +++
    async function addToUserCollection(gameData, buttonElement) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to add games to your collection.");
            // Optionally redirect to login: window.location.href = 'login.html';
            return;
        }

        console.log("Adding to collection:", gameData);

        try {
            // !!! IMPORTANT: Replace 8080 !!!
            const response = await fetch(`http://localhost:8080/collection`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(gameData) // Send { gameId, gameTitle, gameImage }
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

    // +++ NEW: Function to Load and Display User's Collection +++
    async function loadAndDisplayUserCollection() {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to view your collection.");
            // Optionally redirect to login: window.location.href = 'login.html';
            return;
        }

        resultsGrid.style.display = 'none'; // Hide search results
        gameDetailContainer.style.display = 'none'; // Hide game details
        myCollectionContainer.innerHTML = '<p>Loading your collection...</p>';
        myCollectionContainer.style.display = 'grid'; // Or 'block', assuming it will also be a grid

        try {
            // !!! IMPORTANT: Replace 8080 !!!
            const response = await fetch(`http://localhost:8080/collection`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from server.'}));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }

            const userCollection = await response.json();
            console.log("User collection received:", userCollection);
            displayGames(userCollection, true); // Call displayGames, pass true for isUserCollection

        } catch (error) {
            console.error("Error loading collection:", error);
            myCollectionContainer.innerHTML = `<p>Failed to load your collection: ${error.message}</p>
                                             <button id="backToSearchFromCollError">Back to Search</button>`;
            document.getElementById('backToSearchFromCollError')?.addEventListener('click', () => {
                myCollectionContainer.style.display = 'none';
                resultsGrid.style.display = 'grid';
            });
        }
    }

    // Initial game load (if you still want it)
    async function loadInitialGames() {
        const initialGameSearchTerm = "grand theft auto 6";
        resultsGrid.innerHTML = `<p>Loading featured game: ${initialGameSearchTerm}...</p>`;
        performSearchAction(initialGameSearchTerm, true); // Use a common search action
    }

    // Helper to consolidate search logic, can be called by performSearch and loadInitialGames
    async function performSearchAction(searchTerm, isInitialLoad = false) {
        if(!isInitialLoad) { // only manage visibility if it's a new user search
            resultsGrid.style.display = 'grid';
            gameDetailContainer.style.display = 'none';
            myCollectionContainer.style.display = 'none';
        }

        try {
            const pageSize = isInitialLoad ? 5 : 10; // Get 5 for initial, 10 for regular search
            const apiUrl = `http://localhost:8080/api/games/search?query=${encodeURIComponent(searchTerm)}&page_size=${pageSize}`;
            console.log(`Workspaceing from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from server.' }));
                throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
            }
            const data = await response.json();
            console.log('Data received:', data);
            displayGames(data.results, false); // Display as search results
        } catch (error) {
            console.error(`Error during ${isInitialLoad ? 'initial load' : 'search'}:`, error);
            resultsGrid.innerHTML = `<p>An error occurred: ${error.message}.</p>`;
        }
    }

    // Replace original performSearch with a wrapper around performSearchAction
    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            resultsGrid.style.display = 'grid';
            gameDetailContainer.style.display = 'none';
            myCollectionContainer.style.display = 'none';
            displayGames([], false);
            resultsGrid.innerHTML = '<p>Please enter a game name to search.</p>';
            return;
        }
        resultsGrid.innerHTML = '<p>Searching for results...</p>';
        await performSearchAction(searchTerm);
    }

    loadInitialGames(); // Load initial games when DOM is ready
});