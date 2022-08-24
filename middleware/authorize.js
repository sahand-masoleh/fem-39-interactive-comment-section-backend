const checkArgs = require("@utils/checkArgs");
const ErrorWithStatus = require("@utils/ErrorWithStatus");
const jwt = require("jsonwebtoken");

function authorize(req, res, next) {
	const token = req.cookies?.token;
	const id = token && jwt.verify(token, process.env.JWT_SECRET).id;
	if (!id) throw new ErrorWithStatus("not logged in", 401);
	req.user_id = id;
	next();
}

module.exports = authorize;
