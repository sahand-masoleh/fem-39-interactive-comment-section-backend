const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT * FROM posts`);
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
