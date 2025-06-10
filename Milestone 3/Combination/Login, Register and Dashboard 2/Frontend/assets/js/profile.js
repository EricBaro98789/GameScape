document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const ageInput = document.getElementById('age');
    const avatarPreview = document.getElementById('avatarPreview');

    // Fetch and display current user profile data on page load
    async function loadUserProfile() {
        try {
            const response = await fetch('http://localhost:8080/profile', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.status === 401) {
                // If not logged in, redirect to login page
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch profile data.');
            }

            const userData = await response.json();

            emailInput.value = userData.email;
            usernameInput.value = userData.username;
            ageInput.value = userData.age || '';
            if (userData.avatar_url) {
                // Prepend server URL if avatar_url is a relative path like /uploads/filename.jpg
                avatarPreview.src = `http://localhost:8080${userData.avatar_url}`;
            }

        } catch (error) {
            console.error("Error loading profile:", error);
            feedbackMessage.textContent = error.message;
            feedbackMessage.className = 'feedback-message error';
            feedbackMessage.style.display = 'block';
        }
    }

    // Handle form submission to update the profile
    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        feedbackMessage.textContent = '';
        feedbackMessage.style.display = 'none';

        // Use FormData to handle both text fields and file uploads
        const formData = new FormData();
        const avatarFile = document.getElementById('avatar').files[0];

        formData.append('username', usernameInput.value);
        formData.append('age', ageInput.value);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        try {
            const response = await fetch('http://localhost:8080/profile', {
                method: 'PUT',
                credentials: 'include',
                body: formData
                // DO NOT set Content-Type header when using FormData with fetch.
                // The browser will set it correctly to multipart/form-data with the right boundary.
            });

            const result = await response.json();

            if (response.ok) {
                feedbackMessage.textContent = result.message;
                feedbackMessage.className = 'feedback-message success';
                feedbackMessage.style.display = 'block';
                // Update avatar preview with the new URL
                if (result.user.avatar_url) {
                    avatarPreview.src = `http://localhost:8080${result.user.avatar_url}`;
                }
                // Update username in local storage for the welcome message on other pages
                if(result.user.username) {
                    localStorage.setItem('username', result.user.username);
                }
            } else {
                throw new Error(result.error || 'Failed to update profile.');
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            feedbackMessage.textContent = error.message;
            feedbackMessage.className = 'feedback-message error';
            feedbackMessage.style.display = 'block';
        }
    });

    // Initial load of profile data
    loadUserProfile();
});