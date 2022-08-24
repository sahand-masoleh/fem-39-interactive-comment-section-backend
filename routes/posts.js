const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");

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
				WHERE depth < $1
				LIMIT $1
				)
			)
			SELECT cte.*, users.name, users.avatar_url FROM cte
			LEFT JOIN users ON cte.user_id = users.id
			ORDER BY path, date;
			`,
			[DEPTH]
		);
		res.json(rows);
	} catch (error) {
		next(error);
	}
});

router.post("/", async (req, res, next) => {
	const { user, text, parent } = req.body;
	try {
		checkArgs(user, text);

		const { rowCount } = await db.query(
			"INSERT INTO posts(parent_id, user_id, text) VALUES($1, $2, $3)",
			[parent, user, text]
		);
		res.json(rowCount);
	} catch (error) {
		next(error);
	}
});

router.delete("/", async (req, res, next) => {
	const { id } = req.body;
	try {
		checkArgs(id);

		const { rowCount } = await db.query("DELETE FROM posts WHERE id = $1", [
			id,
		]);
		res.json(rowCount);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
