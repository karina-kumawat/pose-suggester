const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'pose123',
  database: 'pose_suggester',
});

module.exports = pool.promise();