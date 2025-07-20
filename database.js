// backend/database.js
const sqlite3 = require('sqlite3').verbose();

// Use ':memory:' for an in-memory database, or a file path for a persistent database.
const DBSOURCE = "spendly.db";

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
      // Cannot open database
      console.error(err.message);
      throw err;
    } else {
        console.log('Connected to the SQLite database.');
        // Create the users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, 
            email TEXT UNIQUE, 
            password TEXT, 
            CONSTRAINT email_unique UNIQUE (email)
            )`,
        (err) => {
            if (err) {
                // Table already created
            } else {
                // Table just created, creating some rows
                console.log('Users table created.');
            }
        });  
    }
});

module.exports = db;