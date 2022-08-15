const router = require("express").Router();
const db = require("@db/db");
const SyncError = require("@utils/SyncError");

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT * FROM posts");
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      "INSERT INTO posts(user_id, text) VALUES($1, $2)",
      [1, "test"]
    );
    res.json(rowCount);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
