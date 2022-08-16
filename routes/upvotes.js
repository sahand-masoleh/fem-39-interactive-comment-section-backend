const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");

router.post("/", async (req, res, next) => {
  const { post, user, isUp } = req.body;
  try {
    checkArgs(post, user, isUp);

    const isUpBool = isUp >= 1;
    const { rowCount } = await db.query(
      `INSERT INTO upvotes(post_id, user_id, is_up)
      VALUES ($1, $2, $3)
      ON CONFLICT ON CONSTRAINT upvotes_pkey
      DO UPDATE
      SET is_up = $3
      WHERE EXCLUDED.post_id = $1 AND EXCLUDED.user_id = $2`,
      [post, user, isUpBool]
    );
    res.json(rowCount);
  } catch (error) {
    next(error);
  }
});

router.delete("/", async (req, res, next) => {
  const { post, user } = req.body;

  try {
    checkArgs(post, user);

    const { rowCount } = await db.query(
      "DELETE FROM upvotes WHERE post_id = $1 AND user_id = $2",
      [post, user]
    );
    res.json(rowCount);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
