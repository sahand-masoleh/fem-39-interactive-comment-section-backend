const LIMIT = 5;
const DEPTH = 3;

function getQuery(from = 0, sort_by, order, page = 0, user_id) {
	const offset = LIMIT * page;
	const parentNode = !from ? "parent_id IS NULL" : `id = ${from}`;
	// depth for limiting by depth
	// path for the frontend
	// seq for sorting
	if (sort_by === "score" && order === "asc") {
		// prettier-ignore
		return `
                WITH RECURSIVE
                cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                    (
                    SELECT *, 0, ARRAY[id], ARRAY[votes, EXTRACT(epoch FROM date)::INT]
                    FROM posts
                    WHERE ${parentNode}
                    ORDER BY votes ASC, date ASC
                    LIMIT ${LIMIT + 1} OFFSET ${offset}
                    )
                    UNION ALL
                    SELECT t2.*, depth+1, path || t2.id, seq || EXTRACT(epoch FROM t2.date)::INT
                    FROM posts t2, cte
                    WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                ) 
                ${selectStatement(user_id)}
            `;
	} else if (sort_by === "score" && order === "desc") {
		// prettier-ignore
		return `
                    WITH RECURSIVE
                    cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                        (
                        SELECT posts.*, 0, ARRAY[id], ARRAY[0 - votes, EXTRACT(epoch FROM date)::INT, id]
                        FROM posts
                        WHERE ${parentNode}
                        ORDER BY votes DESC, date ASC
                        LIMIT ${LIMIT + 1} OFFSET ${offset}
                        )
                        UNION ALL
                        SELECT t2.*, depth+1, path || t2.id, seq || EXTRACT(epoch FROM t2.date)::INT
                        FROM posts t2, cte
                        WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                    )
                    ${selectStatement(user_id)}
                `;
	} else if (sort_by === "date" && order === "asc") {
		// prettier-ignore
		return `
                WITH RECURSIVE
                cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                    (
                    SELECT *, 0, ARRAY[id], ARRAY[EXTRACT(epoch FROM date)::INT, id]
                    FROM posts
                    WHERE ${parentNode}
                    ORDER BY date ASC
                    LIMIT ${LIMIT + 1} OFFSET ${offset}
                    )
                    UNION ALL
                    SELECT t2.*, depth+1, path || t2.id, seq || EXTRACT(epoch FROM t2.date)::INT || t2.id
                    FROM posts t2, cte
                    WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                ) 
                ${selectStatement(user_id)}
            `;
	}
	// (sort_by === "date" && order === "desc")
	else {
		// prettier-ignore
		return `
                WITH RECURSIVE
                cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                    (
                    SELECT *, 0, ARRAY[id], ARRAY[EXTRACT(epoch FROM (NOW() - date))::INT, id]
                    FROM posts
                    WHERE ${parentNode}
                    ORDER BY date DESC
                    LIMIT ${LIMIT + 1} OFFSET ${offset}
                    )
                    UNION ALL
                    SELECT t2.*, depth+1, path || t2.id, seq || EXTRACT(epoch FROM (NOW() - t2.date))::INT || t2.id
                    FROM posts t2, cte
                    WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                ) 
                ${selectStatement(user_id)}
            `;
	}
}

module.exports = getQuery;

function selectStatement(user_id) {
	// prettier-ignore
	return `
            SELECT
                cte.id,
                parent_id,
                user_id,
                text,
                date,
                votes,
                replies,
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
    `
}
