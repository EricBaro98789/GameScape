CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE games (
    game_id INT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    tags VARCHAR(255),
    platform VARCHAR(100),
    release_date DATE,
    developer VARCHAR(100),
    rating FLOAT,
    description TEXT,
    detail_pages TEXT,
    cover_image_url TEXT
);

CREATE TABLE saved_games (
    user_id INT,
    game_id INT,
    user_rating INT,
    tags VARCHAR(255),
    is_collected TINYINT DEFAULT 0,
    status ENUM('Wishlist', 'Currently Playing', 'Completed') NOT NULL,
    hours_played INT,
    review TEXT,
    PRIMARY KEY (user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);
