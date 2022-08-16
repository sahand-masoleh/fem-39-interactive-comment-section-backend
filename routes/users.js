const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");

router.post("/", async (req, res, next) => {
  const { name } = req.body;

  try {
    checkArgs(name);

    const { rowCount } = await db.query("INSERT INTO users(name) VALUES($1)", [
      name,
    ]);

    res.json(rowCount);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
