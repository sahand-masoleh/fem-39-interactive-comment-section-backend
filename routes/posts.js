const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");
const authorize = require("@middleware/authorize");
const ErrorWithStatus = require("@utils/ErrorWithStatus");
const getQuery = require("@utils/getQuery");

router.get("/", async (req, res, next) => {
	try {
		const { sort_by = "score", order = "asc", page = 0 } = req.query;
		const query = getQuery(sort_by, order, page);
		const { rows } = await db.query(query);
		res.json({ page: page * 1, rows });
	} catch (error) {
		next(error);
	}
});

router.post("/", authorize, async (req, res, next) => {
	const { user_id } = req;
	const { parent_id, text } = req.body;
	try {
		checkArgs(parent_id, text);

		const { rows } = await db.query(
			`
			INSERT INTO posts (parent_id, user_id, text)
			SELECT $1, $2, $3
			WHERE EXISTS (
				SELECT FROM posts
				WHERE id = $1 AND NOT user_id = 1
			)
			RETURNING *
			`,
			[parent_id, user_id, text]
		);
		if (rows[0]) {
			res.status(201);
			res.json(rows[0]);
		} else {
			throw new ErrorWithStatus("invalid parameters", 422);
		}
	} catch (error) {
		next(error);
	}
});

router.patch("/", authorize, async (req, res, next) => {
	const { user_id } = req;
	const { id, text } = req.body;
	try {
		checkArgs(id, text);

		const { rows } = await db.query(
			`
			UPDATE posts
			SET text = $1
			WHERE id = $2 AND user_id = $3
			RETURNING id, text
			`,
			[text, id, user_id]
		);
		if (rows[0]) {
			res.json(rows[0]);
		} else {
			throw new ErrorWithStatus("invalid parameters", 422);
		}
	} catch (error) {
		next(error);
	}
});

router.delete("/", authorize, async (req, res, next) => {
	const { user_id } = req;
	const { id } = req.body;
	try {
		checkArgs(id);

		const { rows } = await db.query(
			`
			UPDATE posts SET user_id = 1, text = ''
			WHERE user_id = $1 AND id = $2
			RETURNING id
			`,
			[user_id, id]
		);
		if (rows[0]) {
			res.json(rows[0]);
		} else {
			throw new ErrorWithStatus("invalid parameters", 422);
		}
	} catch (error) {
		next(error);
	}
});

module.exports = router;
