// db.js
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'admin',        // Replace with your MySQL username
    password: 'Admin@123', // Replace with your MySQL password
    database: 'users_jsondata',
};

async function connect() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL');
    return connection;
}

module.exports = connect;
