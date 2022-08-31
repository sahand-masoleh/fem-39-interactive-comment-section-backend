const LIMIT = 5;
const DEPTH = 99;

function getQuery(sort_by, order, page = 0) {
	const ignore = LIMIT * page;
	// depth for limiting by depth
	// path for the frontend
	// seq for sorting
	if (sort_by === "score" && order === "asc") {
		return `
                WITH RECURSIVE
                cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                    (
                    SELECT *, 0, ARRAY[id], ARRAY[votes, id]
                    FROM posts
                    WHERE parent_id IS NULL
                    LIMIT ${LIMIT + 1} OFFSET ${ignore + 1}
                    )
                    UNION ALL
                    SELECT t2.*, depth+1, path || t2.id, seq || ARRAY [t2.votes, t2.id]
                    FROM posts t2, cte
                    WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                ) 
                SELECT cte.id, parent_id, user_id, text, date, votes, replies, depth, path, users.name, users.avatar_url
                FROM cte
                LEFT JOIN users ON cte.user_id = users.id
                ORDER BY seq
            `;
	} else if (sort_by === "score" && order === "desc") {
		return `
                    WITH RECURSIVE
                    total AS (SELECT COUNT(id) AS num_of_users FROM users),
                    cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                        (
                        SELECT posts.*, 0, ARRAY[id], ARRAY[num_of_users - votes, id], num_of_users
                        FROM posts, total
                        WHERE parent_id IS NULL
                        LIMIT ${LIMIT + 1} OFFSET ${ignore + 1}
                        )
                        UNION ALL
                        SELECT t2.*, depth+1, path || t2.id, seq || ARRAY [num_of_users - t2.votes, t2.id], num_of_users
                        FROM posts t2, cte
                        WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                    )
                    SELECT cte.id, parent_id, user_id, text, date, votes, replies, depth, path, users.name, users.avatar_url
                    FROM cte
                    LEFT JOIN users ON cte.user_id = users.id
                    ORDER BY seq
                `;
	} else if (sort_by === "date" && order === "asc") {
		return `
                WITH RECURSIVE
                cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                    (
                    SELECT *, 0, ARRAY[id], ARRAY[EXTRACT(epoch FROM date)::INT, id]
                    FROM posts
                    WHERE parent_id IS NULL
                    LIMIT ${LIMIT + 1} OFFSET ${ignore + 1}
                    )
                    UNION ALL
                    SELECT t2.*, depth+1, path || t2.id, seq || EXTRACT(epoch FROM t2.date)::INT || t2.id
                    FROM posts t2, cte
                    WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                ) 
                SELECT cte.id, parent_id, user_id, text, date, votes, replies, depth, path, users.name, users.avatar_url
                FROM cte
                LEFT JOIN users ON cte.user_id = users.id
                ORDER BY seq
            `;
	}
	// (sort_by === "date" && order === "desc")
	else {
		return `
                WITH RECURSIVE
                cte (id, parent_id, user_id, text, date, votes, replies, depth, path, seq) AS (
                    (
                    SELECT *, 0, ARRAY[id], ARRAY[EXTRACT(epoch FROM (NOW() - date))::INT, id]
                    FROM posts
                    WHERE parent_id IS NULL
                    ORDER BY date DESC
                    LIMIT ${LIMIT + 1} OFFSET ${ignore + 1}
                    )
                    UNION ALL
                    SELECT t2.*, depth+1, path || t2.id, seq || EXTRACT(epoch FROM (NOW() - t2.date))::INT || t2.id
                    FROM posts t2, cte
                    WHERE cte.id = t2.parent_id AND depth < ${DEPTH}
                ) 
                SELECT cte.id, parent_id, user_id, text, date, votes, replies, depth, path, users.name, users.avatar_url
                FROM cte
                LEFT JOIN users ON cte.user_id = users.id
                ORDER BY seq
            `;
	}
}

module.exports = getQuery;
