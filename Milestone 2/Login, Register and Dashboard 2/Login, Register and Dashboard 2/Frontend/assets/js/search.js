// search-app.js
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('gameSearchInput');
    const searchButton = document.getElementById('gameSearchButton'); // Assuming you added this button
    const resultsGrid = document.getElementById('gameResultsGrid');

    // If you prefer to search on "Enter" key press IN ADDITION to a button, you can add:
    // searchInput.addEventListener('keypress', function(event) {
    //     if (event.key === 'Enter') {
    //         event.preventDefault(); // Prevent form submission if it's in a form
    //         performSearch();
    //     }
    // });

    searchButton.addEventListener('click', performSearch);

    async function performSearch() {
        const searchTerm = searchInput.value.trim();

        if (!searchTerm) {
            // You might want to give user feedback here instead of just an alert
            resultsGrid.innerHTML = '<p>Please enter a game name to search.</p>';
            return;
        }

        resultsGrid.innerHTML = '<p>Loading results...</p>'; // Provide loading feedback

        try {
            // !!! IMPORTANT: Replace YOUR_BACKEND_PORT with the actual port your backend is running on (e.g., 3000 or 8080) !!!
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
});