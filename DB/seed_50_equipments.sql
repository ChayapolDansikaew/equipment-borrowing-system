-- Seed 50 Equipment Items for Testing
-- Run this after reset_db.sql to add more equipment

-- Clear existing equipment (optional - comment out if you want to keep existing)
-- DELETE FROM transactions;
-- DELETE FROM equipments;

-- Insert 50 Equipment Items
INSERT INTO equipments (name, type, image_url, status) VALUES
-- Cameras (10 items)
('Sony A7III', 'Camera', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=60', 'available'),
('Sony A7III', 'Camera', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=60', 'available'),
('Canon EOS R5', 'Camera', 'https://images.unsplash.com/photo-1606986628253-e0c4f3e1c9e4?auto=format&fit=crop&w=500&q=60', 'available'),
('Canon EOS R5', 'Camera', 'https://images.unsplash.com/photo-1606986628253-e0c4f3e1c9e4?auto=format&fit=crop&w=500&q=60', 'available'),
('Nikon Z6 II', 'Camera', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Nikon Z6 II', 'Camera', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Panasonic GH5', 'Camera', 'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=500&q=60', 'available'),
('Blackmagic Pocket 6K', 'Camera', 'https://images.unsplash.com/photo-1493709553919-c9f52c8bdc9b?auto=format&fit=crop&w=500&q=60', 'available'),
('Fujifilm X-T4', 'Camera', 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=500&q=60', 'available'),
('RED Komodo', 'Camera', 'https://images.unsplash.com/photo-1579389083046-e3df9c2b3325?auto=format&fit=crop&w=500&q=60', 'available'),

-- Lenses (15 items)
('Canon EF 50mm f/1.4', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Canon EF 50mm f/1.4', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Canon EF 24-70mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Canon EF 24-70mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Canon EF 70-200mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Sony FE 85mm f/1.4', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Sony FE 16-35mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Sigma 35mm f/1.4 Art', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Sigma 35mm f/1.4 Art', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Sigma 24mm f/1.4 Art', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Tamron 28-75mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Tamron 28-75mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Zeiss Batis 25mm f/2', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Rokinon 14mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),
('Tokina 11-16mm f/2.8', 'Lens', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=500&q=60', 'available'),

-- Audio (10 items)
('Rode VideoMic Pro', 'Audio', 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=500&q=60', 'available'),
('Rode VideoMic Pro', 'Audio', 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=500&q=60', 'available'),
('Rode VideoMic Pro', 'Audio', 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=500&q=60', 'available'),
('Zoom H6 Recorder', 'Audio', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=500&q=60', 'available'),
('Zoom H6 Recorder', 'Audio', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=500&q=60', 'available'),
('Sennheiser MKE 600', 'Audio', 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=500&q=60', 'available'),
('Sennheiser G4 Wireless', 'Audio', 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=500&q=60', 'available'),
('Sennheiser G4 Wireless', 'Audio', 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=500&q=60', 'available'),
('Tascam DR-40X', 'Audio', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=500&q=60', 'available'),
('Rode NTG3', 'Audio', 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&w=500&q=60', 'available'),

-- Lighting (10 items)
('Aputure 120d II', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('Aputure 120d II', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('Aputure 300d II', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('Godox SL-60W', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('Godox SL-60W', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('Godox SL-60W', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('Nanlite Forza 60', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('Nanlite Forza 60', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('RGB LED Panel', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),
('RGB LED Panel', 'Lighting', 'https://images.unsplash.com/photo-1524368535928-5b5b1c0b16a4?auto=format&fit=crop&w=500&q=60', 'available'),

-- Tripod (5 items)
('Manfrotto Tripod', 'Tripod', 'https://images.unsplash.com/photo-1617634689989-0c5c3b0d5d10?auto=format&fit=crop&w=500&q=60', 'available'),
('Manfrotto Tripod', 'Tripod', 'https://images.unsplash.com/photo-1617634689989-0c5c3b0d5d10?auto=format&fit=crop&w=500&q=60', 'available'),
('JOBY GorillaPod', 'Tripod', 'https://images.unsplash.com/photo-1617634689989-0c5c3b0d5d10?auto=format&fit=crop&w=500&q=60', 'available'),
('JOBY GorillaPod', 'Tripod', 'https://images.unsplash.com/photo-1617634689989-0c5c3b0d5d10?auto=format&fit=crop&w=500&q=60', 'available'),
('Sachtler Video Tripod', 'Tripod', 'https://images.unsplash.com/photo-1617634689989-0c5c3b0d5d10?auto=format&fit=crop&w=500&q=60', 'available');

-- Verify count
-- SELECT COUNT(*) FROM equipments;
