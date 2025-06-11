// FILE: Frontend/assets/js/admin.js (NEW FILE)

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutBtnAdmin');
    const tableBody = document.getElementById('usersTableBody');

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }
    if (tableBody) {
        tableBody.addEventListener('click', handleTableClick);
    }

    // Load users as soon as the page is ready
    loadUsers();
});

// Function to fetch and display all users
async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    const errorDiv = document.getElementById('adminError');
    if (!tableBody || !errorDiv) return;

    errorDiv.style.display = 'none';
    tableBody.innerHTML = '<tr><td colspan="5">Loading users...</td></tr>';

    try {
        const response = await fetch('http://localhost:8080/admin/users', {
            method: 'GET',
            credentials: 'include' // REQUIRED for sending session cookie
        });

        // If the user is not logged in or not an admin, the server will send an error status
        if (response.status === 401 || response.status === 403) {
            const result = await response.json();
            alert(result.error || "Access Denied. Please log in as an admin.");
            window.location.href = 'login.html'; // Redirect to login
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch user list.');
        }

        const users = await response.json();

        tableBody.innerHTML = ''; // Clear "Loading..." message
        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.isAdmin ? '<strong>Yes</strong>' : 'No'}</td>
                <td>
                    <button class="delete-btn" data-user-id="${user.id}">Delete</button>
                    <!-- Add edit/update role buttons here later -->
                </td>
            `;
        });

    } catch (error) {
        console.error('Error loading users:', error);
        errorDiv.textContent = `Error loading users: ${error.message}`;
        errorDiv.style.display = 'block';
    }
}

// Function to handle clicks within the user table (for delete button)
async function handleTableClick(event) {
    if (event.target.classList.contains('delete-btn')) {
        const userId = event.target.dataset.userId;

        if (confirm(`Are you sure you want to delete user with ID ${userId}?`)) {
            await deleteUser(userId);
        }
    }
}

// Function to delete a user
async function deleteUser(userId) {
    try {
        const response = await fetch(`http://localhost:8080/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message || 'User deleted successfully.');
            loadUsers(); // Refresh the user list
        } else {
            throw new Error(result.error || 'Failed to delete user.');
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        alert(error.message);
    }
}

// Function to log the admin out
async function logoutUser() {
    try {
        const response = await fetch('http://localhost:8080/logout', {
            method: 'POST',
            credentials: 'include'
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
