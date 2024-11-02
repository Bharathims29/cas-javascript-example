const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const connectDb = require('./db');
const cors = require('cors');
const path = require('path');
const { updateJsonAndFetchFileReference } = require('./hashAndUpload');

const app = express();
const PORT = 3012;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register a new user
app.post('/register', async (req, res) => {
    const { username, password, nickname, mobile, imageUrl } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const connection = await connectDb(); // Connect to the database

    const query = 'INSERT INTO users (username, password, nickname, mobile, image_url) VALUES (?, ?, ?, ?, ?)';
    try {
        const [result] = await connection.execute(query, [username, hashedPassword, nickname, mobile, imageUrl]);

        const userId = result.insertId;
        const userData = { id: userId, username, nickname, mobile, imageUrl };

        const jsonFileName = await updateJsonAndFetchFileReference(userData);
        const updateQuery = 'UPDATE users SET json_file_name = ? WHERE id = ?';
        await connection.execute(updateQuery, [jsonFileName, userId]);

        res.json({ success: true, message: 'User registered', jsonFileName });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
    } finally {
        connection.end(); // Close the database connection
    }
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const connection = await connectDb(); // Connect to the database

    const query = 'SELECT * FROM users WHERE username = ?';
    try {
        const [results] = await connection.execute(query, [username]);

        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Include the json_file_name in the response
        res.json({ success: true, message: 'Login successful', user: { ...user, json_file_name: user.json_file_name } });
    } catch (err) {
        return res.status(500).json({ error: 'Database error' });
    } finally {
        connection.end(); // Close the database connection
    }
});

// Update user image
app.post('/update-image', async (req, res) => {
    const { username, imageUrl } = req.body;
    const connection = await connectDb(); // Connect to the database

    const query = 'SELECT * FROM users WHERE username = ?';
    try {
        const [results] = await connection.execute(query, [username]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = results[0];
        const updateQuery = 'UPDATE users SET image_url = ? WHERE id = ?';
        await connection.execute(updateQuery, [imageUrl, user.id]);

        const jsonFileName = await updateJsonAndFetchFileReference({ ...user, imageUrl });
        const updateJsonQuery = 'UPDATE users SET json_file_name = ? WHERE id = ?';
        await connection.execute(updateJsonQuery, [jsonFileName, user.id]);

        res.json({ success: true, message: 'Image updated', jsonFileName });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        connection.end(); // Close the database connection
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
