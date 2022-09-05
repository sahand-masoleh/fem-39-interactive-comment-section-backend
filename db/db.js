const { Pool } = require("pg");

let options;
if (process.env.NODE_ENV === "production") {
	options = {
		connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false,
		},
	};
}
const pool = new Pool(options);

function query(string, params, callback) {
	return pool.query(string, params, callback);
}

module.exports = { query };
