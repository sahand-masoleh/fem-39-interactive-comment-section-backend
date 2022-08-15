const { Pool } = require("pg");
const pool = new Pool();

function query(string, params, callback) {
  return pool.query(string, params, callback);
}

module.exports = { query };
