// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database.js'); // Import our database connection

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_super_secret_key'; // CHANGE THIS to a long, random string

// Middleware
app.use(cors());
app.use(express.json());

// --- AUTHENTICATION ROUTES ---

// 1. User Registration Route
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
        return res.status(400).json({ "error": "Please provide name, email, and password." });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const sql = 'INSERT INTO users (name, email, password) VALUES (?,?,?)';
    const params = [name, email, hashedPassword];

    db.run(sql, params, function(err, result) {
        if (err) {
            res.status(400).json({ "error": "This email is already registered." });
            return;
        }
        res.status(201).json({ "message": "User registered successfully!", "userId": this.lastID });
    });
});

// 2. User Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ "error": "Please provide email and password." });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ "error": "Invalid email or password." });
        }

        // Compare submitted password with the stored hashed password
        const isPasswordCorrect = bcrypt.compareSync(password, user.password);

        if (isPasswordCorrect) {
            // Passwords match! Generate a JWT.
            const payload = { user: { id: user.id, name: user.name } };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

            res.json({
                "message": "Login successful!",
                "token": token,
                "userName": user.name
            });
        } else {
            // Passwords do not match
            res.status(400).json({ "error": "Invalid email or password." });
        }
    });
});


// A simple test route to make sure the server is working
app.get('/', (req, res) => {
    res.send('Hello from the Spendly backend!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});