// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database.js');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_super_secret_and_long_key_that_no_one_can_guess';

app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, payload) => {
        if (err) return res.sendStatus(403);
        req.user = payload.user;
        next();
    });
};

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ "error": "Missing fields" });

    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const sql = 'INSERT INTO users (name, email, password) VALUES (?,?,?)';
    
    db.run(sql, [name, email, hashedPassword], function(err) {
        if (err) return res.status(400).json({ "error": "Email already registered." });

        const userId = this.lastID;
        const sampleTransactions = [
            ['Monthly Salary', 4500.00, 'Income', '2025-07-15', userId],
            ['Starbucks Coffee', -5.75, 'Food', '2025-07-18', userId],
            ['Netflix Subscription', -15.49, 'Bills', '2025-07-14', userId],
            ['Grocery Shopping', -124.50, 'Food', '2025-07-12', userId]
        ];
        const insertSql = 'INSERT INTO transactions (description, amount, category, date, user_id) VALUES (?,?,?,?,?)';
        sampleTransactions.forEach(t => db.run(insertSql, t));

        res.status(201).json({ "message": "User registered successfully!" });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ "error": "Missing fields" });

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ "error": "Invalid email or password." });
        }
        const payload = { user: { id: user.id, name: user.name } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: "Login successful!", token, userName: user.name });
    });
});


// === DATA ROUTES ===

app.post('/api/transactions', authenticateToken, (req, res) => {
    const { description, amount, category, date } = req.body;
    const userId = req.user.id;

    if (!description || !amount || !category || !date) {
        return res.status(400).json({ "error": "All fields are required." });
    }

    // **** THIS IS THE NEW LOGIC ****
    // Convert amount to a number.
    let finalAmount = parseFloat(amount);

    // If the category is anything other than 'Income', make the amount negative.
    if (category !== 'Income') {
        finalAmount = -Math.abs(finalAmount); // Use Math.abs to ensure it's negative
    }

    const sql = 'INSERT INTO transactions (description, amount, category, date, user_id) VALUES (?,?,?,?,?)';
    // Use the finalAmount in the database query
    const params = [description, finalAmount, category, date, userId];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.status(201).json({ "message": "Transaction added successfully", "id": this.lastID });
    });
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC";

    db.all(sql, [userId], (err, transactions) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }

        const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
        const monthlySpending = transactions
            .filter(t => t.amount < 0 && new Date(t.date).getMonth() === new Date().getMonth())
            .reduce((sum, t) => sum + t.amount, 0);

        const investmentData = {
            portfolio: [
                { ticker: 'AAPL', name: 'Apple Inc.', value: 12500.00, change: 2.1 },
                { ticker: 'GOOGL', name: 'Alphabet Inc.', value: 8230.50, change: -0.5 },
                { ticker: 'TSLA', name: 'Tesla, Inc.', value: 5400.00, change: 5.8 },
            ],
            gains: 789.12
        };
        
         const expenseHistory = [
            { month: 'Jan', expense: 650 }, { month: 'Feb', expense: 590 },
            { month: 'Mar', expense: 800 }, { month: 'Apr', expense: 810 },
            { month: 'May', expense: 560 }, { month: 'Jun', expense: 550 },
            { month: 'Jul', expense: Math.abs(monthlySpending) }
        ];

        res.json({
            summary: {
                totalBalance,
                monthlySpending,
                investmentGains: investmentData.gains
            },
            recentTransactions: transactions.slice(0, 5),
            investments: investmentData.portfolio,
            expenseChartData: expenseHistory
        });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});