-- 插入用户
INSERT INTO users (username, email, password_hash) VALUES
('alice', 'alice@example.com', 'hashed_pw_alice'),
('bob', 'bob@example.com', 'hashed_pw_bob'),
('charlie', 'charlie@example.com', 'hashed_pw_charlie');

-- 插入游戏
INSERT INTO games (game_id, title, genre, platform, release_date, developer, rating, description, detail_pages, cover_image_url) VALUES
(1, 'Hollow Knight', 'Metroidvania', 'PC', '2017-02-24', 'Team Cherry', 9.5, 'Explore the depths of Hallownest.', 'https://store.steampowered.com/app/367520/Hollow_Knight/', 'https://cdn.example.com/hk.jpg'),
(2, 'Celeste', 'Platformer', 'Switch', '2018-01-25', 'Matt Makes Games', 9.0, 'Climb the mountain.', 'https://store.steampowered.com/app/504230/Celeste/', 'https://cdn.example.com/celeste.jpg'),
(3, 'Stardew Valley', 'Simulation', 'PC', '2016-02-26', 'ConcernedApe', 8.8, 'Farming and life simulation game.', 'https://store.steampowered.com/app/413150/Stardew_Valley/', 'https://cdn.example.com/stardew.jpg');

-- 插入保存记录
INSERT INTO saved_games (user_id, game_id, user_rating, tags, notes, status, hours_played, review) VALUES
(1, 1, 10, 'Challenging,Atmospheric', 'Loved the boss fights.', 'Completed', 30, 'Masterpiece with beautiful design.'),
(1, 2, 9, 'Platformer,Story-rich', 'Took me 10 hours to finish.', 'Completed', 10, 'Emotional and fun to play.'),
(2, 3, 8, 'Relaxing,Farming', 'Nice break from action games.', 'Currently Playing', 15, 'Great music and gameplay.'),
(3, 1, 7, 'Difficult,Dark', 'Got stuck at some point.', 'Wishlist', 0, 'Waiting to try it soon.');
