require("module-alias/register");
const express = require("express");
const app = express();
const port = process.env.PORT;

app.get("/", (req, res) => {
  res.send("Nothing to see here...");
});

const posts = require("@routes/posts");
app.use("/posts", posts);

app.use((req, res) => {
  res.status(404);
  res.json({ success: false, message: "not found" });
});

app.use((error, req, res, next) => {
  console.log(error.message);
  res.status(error.status || 500);
  res.json({ success: false, message: error.type || "internal server error" });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
