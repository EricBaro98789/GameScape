// FILE: Frontend/assets/js/admin.js (UPDATED with robust rendering)

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const logoutButton = document.getElementById('logoutBtnAdmin');
    const tableBody = document.getElementById('usersTableBody');
    const addUserForm = document.getElementById('addUserForm');
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const closeModalBtn = document.querySelector('.close-modal');

    // --- Event Listeners ---
    if (logoutButton) logoutButton.addEventListener('click', logoutUser);
    if (addUserForm) addUserForm.addEventListener('submit', handleAddUser);
    if (editUserForm) editUserForm.addEventListener('submit', handleEditUser);
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => editUserModal.style.display = 'none');
    if (tableBody) tableBody.addEventListener('click', handleTableClick);

    // Initial load of user data
    loadUsers();
});

// --- Main Data Loading Function ---
async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    const errorDiv = document.getElementById('adminError');
    if (!tableBody || !errorDiv) return;

    errorDiv.style.display = 'none';
    tableBody.innerHTML = '<tr><td colspan="7">Loading users...</td></tr>';

    try {
        const response = await fetchWithAuth('http://localhost:8080/admin/users');
        if (response.status === 401 || response.status === 403) {
            alert("Access Denied. Please log in as an admin.");
            window.location.href = 'login.html';
            return;
        }
        if (!response.ok) throw new Error('Failed to fetch user list.');

        const users = await response.json();
        console.log("Received users from server:", users); // Debugging line

        tableBody.innerHTML = '';
        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
            return;
        }

        // More robust way to create table rows
        users.forEach(user => {
            const row = document.createElement('tr');

            // 1. ID
            const idCell = document.createElement('td');
            idCell.textContent = user.id;
            row.appendChild(idCell);

            // 2. Username
            const usernameCell = document.createElement('td');
            usernameCell.textContent = user.username;
            row.appendChild(usernameCell);

            // 3. Email
            const emailCell = document.createElement('td');
            emailCell.textContent = user.email;
            row.appendChild(emailCell);

            // 4. Is Admin
            const isAdminCell = document.createElement('td');
            isAdminCell.innerHTML = user.isAdmin ? '<strong>Yes</strong>' : 'No';
            row.appendChild(isAdminCell);

            // 5. Avatar
            const avatarCell = document.createElement('td');
            const avatarImg = document.createElement('img');
            avatarImg.className = 'user-avatar';
            avatarImg.src = user.avatar_url ? `http://localhost:8080${user.avatar_url}` : 'assets/images/placeholder.jpg';
            avatarImg.alt = "Avatar";
            avatarImg.onerror = () => { avatarImg.src = 'assets/images/placeholder.jpg'; }; // Fallback for broken image links
            avatarCell.appendChild(avatarImg);
            row.appendChild(avatarCell);

            // 6. Address
            const addressCell = document.createElement('td');
            addressCell.textContent = user.address || 'N/A';
            row.appendChild(addressCell);

            // 7. Actions
            const actionsCell = document.createElement('td');
            actionsCell.className = 'actions-cell';
            const editButton = document.createElement('button');
            editButton.className = 'edit-btn';
            editButton.textContent = 'Edit';
            editButton.dataset.userId = user.id;
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete';
            deleteButton.dataset.userId = user.id;
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);

            tableBody.appendChild(row);
        });

    } catch (error) {
        handleError(error, errorDiv, "Error loading users");
    }
}

// --- Event Handlers ---
async function handleTableClick(event) {
    const target = event.target;
    const userId = target.dataset.userId;

    if (target.classList.contains('delete-btn')) {
        if (confirm(`Are you sure you want to delete user with ID ${userId}?`)) {
            await deleteUser(userId);
        }
    } else if (target.classList.contains('edit-btn')) {
        // Find the user data from the loaded table to pre-fill the form
        const row = target.closest('tr');
        const username = row.cells[1].textContent;
        const address = row.cells[5].textContent;
        const isAdmin = row.cells[3].textContent === 'Yes';
        showEditModal(userId, username, address, isAdmin);
    }
}

async function handleAddUser(event) {
    event.preventDefault();
    const username = document.getElementById('addUsername').value;
    const email = document.getElementById('addEmail').value;
    const password = document.getElementById('addPassword').value;
    const isAdmin = document.getElementById('addIsAdmin').checked;

    try {
        const response = await fetchWithAuth('http://localhost:8080/admin/users/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, isAdmin })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to add user.");

        showFeedback(result.message || 'User added successfully!', 'success');
        event.target.reset(); // Clear the form
        loadUsers(); // Refresh the list
    } catch (error) {
        handleError(error, document.getElementById('adminFeedback'), "Error adding user");
    }
}

async function handleEditUser(event) {
    event.preventDefault();
    const userId = document.getElementById('editUserId').value;
    const formData = new FormData(document.getElementById('editUserForm'));
    // Handle checkbox value correctly
    formData.set('isAdmin', document.getElementById('editIsAdmin').checked);

    try {
        const response = await fetchWithAuth(`http://localhost:8080/admin/users/${userId}/update`, {
            method: 'PUT',
            body: formData // Let browser set Content-Type for FormData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to update user.");

        showFeedback(result.message || 'User updated successfully!', 'success');
        document.getElementById('editUserModal').style.display = 'none';
        loadUsers();
    } catch (error) {
        handleError(error, document.getElementById('adminFeedback'), "Error updating user");
    }
}

// --- Helper Functions ---
function showEditModal(id, username, address, isAdmin) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUsername').value = username;
    document.getElementById('editAddress').value = address === 'N/A' ? '' : address;
    document.getElementById('editIsAdmin').checked = isAdmin;
    document.getElementById('editUserModal').style.display = 'flex';
}

async function deleteUser(userId) {
    try {
        const response = await fetchWithAuth(`http://localhost:8080/admin/users/${userId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to delete user.");
        showFeedback(result.message || 'User deleted.', 'success');
        loadUsers();
    } catch (error) {
        handleError(error, document.getElementById('adminFeedback'), 'Error deleting user');
    }
}

async function logoutUser() {
    try {
        await fetchWithAuth('http://localhost:8080/logout', { method: 'POST' });
        localStorage.removeItem("username");
        window.location.href = 'login.html';
    } catch (error) {
        alert("Error logging out.");
    }
}

function showFeedback(message, type) {
    const feedbackDiv = document.getElementById('adminFeedback');
    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback-message ${type}`;
    feedbackDiv.style.display = 'block';
    setTimeout(() => {
        feedbackDiv.style.display = 'none';
    }, 4000);
}
function handleError(error, element, defaultMessage) {
    console.error(`${defaultMessage}:`, error);
    element.textContent = `${defaultMessage}: ${error.message}`;
    element.style.display = 'block';
}

// Wrapper for fetch to include credentials by default
async function fetchWithAuth(url, options = {}) {
    options.credentials = 'include';
    return fetch(url, options);
}
