-- Maktaba — database/seed.sql
-- Sample data for local development. Run after schema.sql:
--   psql "$DATABASE_URL" -f database/schema.sql -f database/seed.sql

INSERT INTO books (title, author, isbn, synopsis, category, language, publisher, pages, rating, reads, created_at) VALUES
('Things Fall Apart', 'Chinua Achebe', '9780435905255', 'A portrait of pre-colonial Igbo life and the arrival of colonialism, told through the tragedy of Okonkwo.', 'fiction', 'English', 'Heinemann', 209, 4.6, 128000, '2024-01-10'),
('The Wretched of the Earth', 'Frantz Fanon', '9780802141323', 'A foundational text on decolonization, violence, and national consciousness.', 'history', 'English', 'Grove Press', 251, 4.5, 96000, '2024-01-14'),
('Petals of Blood', 'Ngũgĩ wa Thiong''o', '9780143026252', 'Four strangers linked by a small Kenyan town confront the false promises of independence.', 'fiction', 'English', 'Heinemann', 432, 4.5, 84000, '2024-02-02'),
('Facing Mount Kenya', 'Jomo Kenyatta', '9780941533210', 'An ethnographic account of Gikuyu life and culture, written before Kenyan independence.', 'history', 'English', 'Vintage', 339, 4.3, 71000, '2024-02-20'),
('The Art of War', 'Sun Tzu', '9781590302255', 'A classic treatise on strategy, still applied to business and leadership today.', 'business', 'English', 'Public domain', 96, 4.4, 65000, '2024-03-01'),
('Meditations', 'Marcus Aurelius', '9780140449334', 'Private reflections on stoicism, duty, and mortality from a Roman emperor.', 'self-improvement', 'English', 'Public domain', 254, 4.6, 58000, '2024-03-10'),
('Half of a Yellow Sun', 'Chimamanda Ngozi Adichie', '9780007200283', 'A story of the Biafran war seen through the eyes of five people.', 'fiction', 'English', 'Fourth Estate', 448, 4.8, 51000, '2024-03-18'),
('Wizard of the Crow', 'Ngũgĩ wa Thiong''o', '9781400033843', 'A satirical epic about power and resistance in a fictional African state.', 'fiction', 'English', 'Anchor', 768, 4.7, 39000, '2024-04-01'),
('Americanah', 'Chimamanda Ngozi Adichie', '9780307455925', 'A sharp, funny novel about race, identity, and love across Nigeria, the US, and the UK.', 'fiction', 'English', 'Anchor', 588, 4.7, 61000, '2024-04-12'),
('The Concubine', 'Elechi Amadi', '9780435900030', 'A tragic love story rooted in Igbo cosmology and village life.', 'fiction', 'English', 'Heinemann', 264, 4.6, 22000, '2024-04-20'),
('A Grain of Wheat', 'Ngũgĩ wa Thiong''o', '9780143105850', 'Kenyans confront memory, betrayal, and independence on the eve of Uhuru.', 'history', 'English', 'Penguin', 280, 4.6, 34000, '2024-05-02'),
('The Prophet', 'Kahlil Gibran', '9780679440674', 'Poetic essays on love, work, and freedom, delivered as parables.', 'religion', 'English', 'Public domain', 127, 4.5, 41000, now() - interval '26 days'),
('Walden', 'Henry David Thoreau', '9781420951098', 'A reflection on simple living, self-reliance, and nature.', 'self-improvement', 'English', 'Public domain', 218, 4.3, 28000, now() - interval '21 days'),
('The River Between', 'Ngũgĩ wa Thiong''o', '9780435905248', 'Two villages divided by faith and tradition on either side of a river.', 'fiction', 'English', 'Heinemann', 176, 4.4, 19000, now() - interval '14 days'),
('Nervous Conditions', 'Tsitsi Dangarembga', '9780954702335', 'A coming-of-age story about a young Zimbabwean girl''s education and family.', 'fiction', 'English', 'Women''s Press', 224, 4.5, 17000, now() - interval '10 days'),
('Devil on the Cross', 'Ngũgĩ wa Thiong''o', '9780435905354', 'Written in prison, a searing satire of post-independence greed.', 'fiction', 'English', 'Heinemann', 254, 4.4, 15000, now() - interval '7 days'),
('So Long a Letter', 'Mariama Bâ', '9780435905254', 'A widow''s letter to her friend, on marriage, polygamy, and independence.', 'fiction', 'English', 'Heinemann', 96, 4.6, 14000, now() - interval '5 days'),
('The Interpreters', 'Wole Soyinka', '9780435900177', 'Young Nigerian intellectuals navigate a newly independent society.', 'fiction', 'English', 'Heinemann', 251, 4.3, 9000, now() - interval '3 days'),
('No Longer at Ease', 'Chinua Achebe', '9780385474559', 'Okonkwo''s grandson struggles with corruption and tradition in colonial Lagos.', 'fiction', 'English', 'Anchor', 168, 4.5, 12000, now() - interval '1 day');

-- A sample user (password: "supersecret1", bcrypt-hashed) for local testing.
INSERT INTO users (name, email, password_hash) VALUES
('Asha Wanjiru', 'asha@example.com', '$2a$10$ScMudyGfdx3lWbRHZmlCGusDO6Z1syDO2V9kpuikiFf.x1PoMBNOa');

-- A completed payment and matching download, so the profile/downloads flow
-- has something to display out of the box.
INSERT INTO payments (user_id, amount, mpesa_receipt, status)
VALUES (1, 5.00, 'NLJ7RT61SV', 'completed');

INSERT INTO downloads (user_id, book_id, payment_id)
VALUES (1, 1, 1);

INSERT INTO reading_history (user_id, book_id, read_time)
VALUES (1, 1, 1420), (1, 7, 640);

-- An admin account for the admin panel (Phase 11). Password: "adminpass123".
INSERT INTO users (name, email, password_hash, role) VALUES
('Maktaba Admin', 'admin@maktaba.co.ke', '$2a$10$cSY4skkOHtNz4ab9KF3PJOL897d7TCX7vC.vdkzKXVDcD6zMONJ42', 'admin');

-- Mark a couple of books as featured, to exercise the admin "featured" toggle.
UPDATE books SET featured = true WHERE id IN (101, 1);
