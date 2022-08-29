function getQuery(order) {
	switch (order) {
		case "date-desc":
			return [
				"ARRAY[EXTRACT(epoch FROM (NOW() - date))::INT, id]",
				"ORDER BY date DESC",
				"seq || EXTRACT(epoch FROM (NOW() - t2.date))::INT || t2.id",
			];
		case "date-asc":
			return [
				"ARRAY[EXTRACT(epoch FROM date)::INT, id]",
				"",
				"seq || EXTRACT(epoch FROM t2.date)::INT || t2.id",
			];
	}
}

module.exports = getQuery;
