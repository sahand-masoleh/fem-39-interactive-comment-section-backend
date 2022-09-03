const ErrorWithStatus = require("@utils/ErrorWithStatus");

function checkArgs(...args) {
	[...args].some((e) => {
		if (e === undefined) throw new ErrorWithStatus("missing argument", 400);
	});
}

module.exports = checkArgs;
