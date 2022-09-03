const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");
const authorize = require("@middleware/authorize");

router.post("/", authorize, async (req, res, next) => {
	const { user_id } = req;
	const { id: post_id, is_up } = req.body;

	try {
		checkArgs(post_id, user_id, is_up);

		const isUpBool = is_up >= 1;
		const { rows } = await db.query(
			`INSERT INTO upvotes(post_id, user_id, is_up)
      VALUES ($1, $2, $3)
      ON CONFLICT ON CONSTRAINT upvotes_pkey
      DO UPDATE
      SET is_up = $3
      WHERE EXCLUDED.post_id = $1 AND EXCLUDED.user_id = $2
      RETURNING post_id, is_up
      `,
			[post_id, user_id, isUpBool]
		);
		res.json(rows[0]);
	} catch (error) {
		next(error);
	}
});

router.delete("/", authorize, async (req, res, next) => {
	const { user_id } = req;
	const { id: post_id } = req.body;

	try {
		checkArgs(post_id, user_id);

		const { rows } = await db.query(
			`
      DELETE FROM upvotes WHERE post_id = $1 AND user_id = $2
      RETURNING post_id
      `,
			[post_id, user_id]
		);
		res.json(rows[0]);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
