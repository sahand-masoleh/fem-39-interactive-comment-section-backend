const router = require("express").Router();
const db = require("@db/db");
const checkArgs = require("@utils/checkArgs");
const ErrorWithStatus = require("@utils/ErrorWithStatus");
const jwt = require("jsonwebtoken");

const authorize = require("@middleware/authorize");

const GH_ACCESS = new URL("login/oauth/access_token", "https://github.com");
const GH_INFO = new URL("user", "https://api.github.com");

router.get("/check", authorize, async (req, res, next) => {
	const { user_id } = req;

	try {
		const { rows } = await db.query(
			`
			SELECT id, avatar_url, url, name
			FROM users
			WHERE id = $1
		`,
			[user_id]
		);
		if (!rows[0]) {
			res.clearCookie("token", { domain: "localhost", path: "/" });
			throw new ErrorWithStatus("user deleted", 410);
		}
		res.json(rows[0]);
	} catch (error) {
		next(error);
	}
});

router.post("/login", async (req, res, next) => {
	try {
		const { code } = req.body;
		checkArgs(code);
		const ghAuthString = JSON.stringify({
			code,
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
		});

		const ghAuthResult = await fetch(GH_ACCESS, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				accept: "application/json",
			},
			body: ghAuthString,
		});

		const { access_token } = await ghAuthResult.json();
		if (!access_token) {
			throw new ErrorWithStatus("authentication failed", 401);
		}

		const ghUserInfo = await fetch(GH_INFO, {
			headers: {
				Authorization: `token ${access_token}`,
			},
		});

		const {
			id: githubId,
			avatar_url,
			html_url: url,
			name,
		} = await ghUserInfo.json();

		const dbUpsert = await db.query(
			`
			INSERT INTO users (github_id, avatar_url, url, name)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (github_id)
			DO UPDATE SET avatar_url = $2, url = $3, name = $4
			RETURNING id
		`,
			[githubId, avatar_url, url, name]
		);

		const { id } = dbUpsert.rows[0];
		if (!id) throw new ErrorWithStatus();

		const token = jwt.sign({ id }, process.env.JWT_SECRET);

		res.cookie("token", token, {
			domain: "localhost",
			path: "/",
			sameSite: "none",
			secure: true,
		});
		res.redirect("../users/check");
	} catch (error) {
		next(error);
	}
});

router.post("/logout", (_, res) => {
	res.clearCookie("token", { domain: "localhost", path: "/" });
	res.end();
});

module.exports = router;
