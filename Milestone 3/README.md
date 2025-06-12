GameScape: Personalized Game Discovery and Journal
1. Project Description
GameScape is a dynamic web application designed to provide gamers with a centralized platform to discover new video games and manage their personal gaming library. By integrating with the extensive RAWG Video Games Database API, GameScape offers access to a vast catalog of games across all major platforms.

The core purpose of the application is to create a personalized space where users can move beyond passive browsing and actively engage with their gaming journey. Users can search for any game, view its detailed information, and save it to a persistent personal collection. The application supports full user authentication, allowing each user's collection and profile information to be stored securely and permanently in a custom database.

2. Setup Instructions
To run this project locally, you will need to set up and run both the Backend (Node.js/Express) and the Frontend (HTML/CSS/JS) servers.

Backend Setup
The backend server handles API logic, database interaction, and user authentication.

Navigate to the Backend Directory:

cd "Milestone 3/GameScape_Group6/Backend"

Install Dependencies:
Run npm install to download all the necessary Node.js packages listed in package.json.

npm install

npm install multer

This includes Express, Sequelize, SQLite3, CORS, bcryptjs, express-session, multer, etc.

Start the Backend Server:

node server.js

By default, the server will run on http://localhost:8080. You should see log messages in your terminal confirming the database connection and that the server is listening.

Database and Schema Initialization:

Create an Admin User (Optional but Recommended):

After registering a user through the application, you can manually make them an admin.

Use a database tool like DB Browser for SQLite to open the gamescape_database.sqlite file.

Navigate to the users table, find your user, and change the value in the isAdmin column from 0 to 1.

You can also login to the existed Admin User account

email: jkgdvdg@gmail.com
password: 123

After login, you can use the Admin Dashboard to create you own Admin account

Frontend Setup
The frontend is built with vanilla HTML, CSS, and JavaScript and requires a simple live server for development.

Use a Live Server:

The recommended method is using the Live Server extension in Visual Studio Code.

Start the Frontend Server:

Right-click on Search.html (or login.html/register.html).

Select "Open with Live Server".

Check API Port:

Ensure that the API URLs in the frontend JavaScript files (e.g., assets/js/search.js, assets/js/admin.js) match the port your backend is running on. By default, they are set to http://localhost:8080.

Once both servers are running, you can access the application through the URL provided by Live Server (e.g., http://127.0.0.1:5500).

3. Features and Functionality
User Features
User Registration: Securely create a new user account. Passwords are never stored in plain text; they are hashed using bcryptjs.

User Login & Session Management: Users can log in with their credentials. The backend uses express-session to create a persistent session stored in an SQLite database, ensuring users stay logged in across server restarts.

User Profile Management: Logged-in users can navigate to a profile page to update their username, age, and upload a custom avatar image.

Game Search: Search the entire RAWG database for any game via a simple search bar.

View Game Details: Click on any game from search results or a personal collection to view a detailed page with its description, rating, platforms, genres, and more.

Personal Game Collection:

Add: Logged-in users can add any game from the search results to their personal collection.

View: Users can view all the games they have saved in a dedicated "My Collection" view.

Remove: Users can remove games from their collection.

Persistence: All collection data is stored permanently in the database and linked to the user's account.

Data Export: Users can export their personal game collection to either a JSON or a CSV file.

Dark/Light Mode: A theme toggle allows users to switch between a light and dark user interface for better accessibility and user comfort.

Admin Features
Secure Admin Dashboard: A separate dashboard page accessible only to users with admin privileges.

List All Users: Admins can view a complete list of all registered users in the application.

Delete Users: Admins have the ability to delete any user account (except their own).

Add New Users: Admins can create new user accounts directly from the dashboard.


4. Known Bugs or Limitations
Filters and Sorting: The filter checkboxes (Platforms) and the "Sort by" dropdown on the search page are currently UI placeholders and do not yet have functional filtering logic implemented.

Limited User Interaction: There is no user interface for more advanced interactions like writing a personal review or giving a custom rating to a collected game. This "journaling" functionality will be implemented in the future.

Forgot Password: The "Forgot password?" link on the login page is a placeholder and does not have functionality.

Simple Feedback: Most user feedback for actions (e.g., "Game added to collection") is currently handled via simple browser alert()s or console logs. A more integrated, non-blocking notification system would be a future improvement.



5. Video demonstration link

https://www.youtube.com/watch?v=sN5_1FOl3zc

