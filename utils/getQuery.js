const LIMIT = 5;
const DEPTH = 3;

// the db query builder
// due to the complexity and the changing amount of variables,
// it's unfeasable to use bind arguments
// therefore, the received queries are manually checked to protect against injection attacks

function getQuery(from = 0, sort_by, order, page = 0, user_id) {
	const offset = LIMIT * page;
	// start from a specific post if viewing deeper than max depth
	const parentNode = !from ? "parent_id IS NULL" : `id = ${from}`;

	let orphanSeq;
	let orphanSort;
	let childSeq;
	if (sort_by === "score" && order === "asc") {
		// seq by ascending votes for orphans and ascending date for children
		orphanSeq = `votes, EXTRACT(epoch FROM date)::INT`;
		orphanSort = `votes ASC, date ASC`;
		childSeq = `EXTRACT(epoch FROM t2.date)::INT || t2.id`;
		//
	} else if (sort_by === "score" && order === "desc") {
		// seq by descending votes for orphans and ascending date for children
		orphanSeq = `0 - votes, EXTRACT(epoch FROM date)::INT, id`;
		orphanSort = `votes DESC, date ASC`;
		childSeq = `EXTRACT(epoch FROM t2.date)::INT || t2.id`;
		//
	} else if (sort_by === "date" && order === "asc") {
		// seq by ascending date for all
		orphanSeq = `EXTRACT(epoch FROM date)::INT, id`;
		orphanSort = `date ASC`;
		childSeq = `EXTRACT(epoch FROM t2.date)::INT || t2.id`;
		//
	} else {
		// default -> (sort_by === "date" && order === "desc")
		// seq by descending date for all
		orphanSeq = `EXTRACT(epoch FROM (NOW() - date))::INT, id`;
		orphanSort = `date DESC`;
		childSeq = `EXTRACT(epoch FROM (NOW() - t2.date))::INT || t2.id`;
	}

	// depth for limiting by depth
	// path for the frontend
	// seq for sorting
	// prettier-ignore
	return `
        WITH RECURSIVE
        cte (id, parent_id, user_id, text, date, votes, replies, is_edited, depth, path, seq) AS (
            (
            SELECT *, 0, ARRAY[id], ARRAY[${orphanSeq}]
            FROM posts
            WHERE ${parentNode}
            ORDER BY ${orphanSort}
            LIMIT ${LIMIT + 1} OFFSET ${offset}
            )
            UNION ALL
            SELECT t2.*, depth+1, path || t2.id, seq || ${childSeq}
            FROM posts t2, cte
            WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
        ) 
        SELECT
            cte.id,
            parent_id,
            user_id,
            text,
            date,
            votes,
            replies,
            is_edited,
            depth,
            path,
            users.name,
            users.avatar_url,
            users.url
            ${user_id ? ', is_up': ''}
        FROM cte
        LEFT JOIN users ON cte.user_id = users.id
        ${user_id ? `
        LEFT JOIN
            (SELECT post_id, is_up FROM upvotes WHERE user_id = ${user_id}) AS u
            ON cte.id = u.post_id
        `: ''}
        ORDER BY seq
    `;
}

module.exports = getQuery;
