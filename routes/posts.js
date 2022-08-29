const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");
const authorize = require("@middleware/authorize");
const ErrorWithStatus = require("@utils/ErrorWithStatus");
const getQuery = require("@utils/getQuery");

const LIMIT = 999;
const DEPTH = 999;

router.get("/", async (req, res, next) => {
	try {
		const query = getQuery("date-asc");
		const { rows } = await db.query(
			// depth for limiting by depth
			// path for the frontend
			// seq for sorting
			`
			WITH RECURSIVE cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
				(
				SELECT *, 0, ARRAY[id], ${query[0]}
				FROM posts
				WHERE parent_id IS NULL
				${query[1]}
				LIMIT $1
				)
				UNION ALL
				SELECT t2.*, depth+1, path || t2.id, ${query[2]}
				FROM posts t2, cte
				WHERE cte.id = t2.parent_id AND depth < $2
			) 
			SELECT cte.id, parent_id, user_id, text, date, votes, replies, depth, path, users.name, users.avatar_url
			FROM cte
			LEFT JOIN users ON cte.user_id = users.id
			ORDER BY seq
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
