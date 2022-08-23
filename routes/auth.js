const router = require("express").Router();
const checkArgs = require("@utils/checkArgs");
const ErrorWithStatus = require("@utils/ErrorWithStatus");
const jwt = require("jsonwebtoken");

const GH_ACCESS = new URL("login/oauth/access_token", "https://github.com");
const GH_INFO = new URL("user", "https://api.github.com");

router.post("/", async (req, res, next) => {
	try {
		const { code } = req.body;
		checkArgs(code);
		const string = JSON.stringify({
			code,
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
		});

		const result = await fetch(GH_ACCESS, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				accept: "application/json",
			},
			body: string,
		});

		const { access_token } = await result.json();
		if (!access_token) {
			throw new ErrorWithStatus("authentication failed", 401);
		}

		const userInfo = await fetch(GH_INFO, {
			headers: {
				Authorization: `token ${access_token}`,
			},
		});
		const { id, avatar_url, url, name } = await userInfo.json();

		res.end();
	} catch (error) {
		next(error);
	}
});

module.exports = router;
