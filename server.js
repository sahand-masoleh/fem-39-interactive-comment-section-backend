require("module-alias/register");
const express = require("express");
const app = express();
const port = process.env.PORT;

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Nothing to see here...");
});

const users = require("@routes/users");
app.use("/users", users);

const posts = require("@routes/posts");
app.use("/posts", posts);

const upvotes = require("@routes/upvotes");
app.use("/upvotes", upvotes);

app.use((req, res) => {
  res.status(404);
  res.json({ success: false, message: "not found" });
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    success: false,
    message: error.message || "internal server error",
  });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
