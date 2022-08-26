const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");
const authorize = require("@middleware/authorize");
const ErrorWithStatus = require("@utils/ErrorWithStatus");

const LIMIT = 999;
const DEPTH = 999;

router.get("/", async (req, res, next) => {
	try {
		const { rows } = await db.query(
			`
			WITH RECURSIVE cte AS (
				(
				SELECT *, 0 AS depth, ARRAY[id] AS path
				FROM posts
				WHERE parent_id IS NULL
				LIMIT $1
				)
				UNION
				(
				SELECT t2.*, depth+1, path || t2.id
				FROM posts t2
				INNER JOIN cte ON cte.id = t2.parent_id
				WHERE depth < $2
				LIMIT $1
				)
			)
			SELECT cte.*, users.name, users.avatar_url FROM cte
			LEFT JOIN users ON cte.user_id = users.id
			ORDER BY path;
			`,
			[LIMIT, DEPTH]
		);
		res.json(rows);
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
