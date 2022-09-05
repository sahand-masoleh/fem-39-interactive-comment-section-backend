#!/bin/bash 
PSQL="psql --username=postgres --dbname=postgres -c"
_=$($PSQL "DROP DATABASE IF EXISTS comments")
_=$($PSQL "CREATE DATABASE comments")
# RESTORE=$(psql --username=postgres --dbname=comments -f comments.sql)

PSQL="psql --username=postgres --dbname=comments -t -c"
OWNER="fem39"

USERS=$($PSQL '
    CREATE TABLE users (
        id INT GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL,
        github_id INT UNIQUE,
        avatar_url TEXT,
        url TEXT,
        PRIMARY KEY (id)
    )
')
USERS_OWNER=$($PSQL "ALTER TABLE users OWNER TO $OWNER")
if [[ ($USERS = "CREATE TABLE") && ($USERS_OWNER = "ALTER TABLE") ]]
    then echo "TABLE: users --> $OWNER"
fi

POSTS=$($PSQL '
    CREATE TABLE posts (
        id INT GENERATED ALWAYS AS IDENTITY,
        parent_id INT,
        user_id INT NOT NULL,
        text TEXT NOT NULL,
        date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        votes INT DEFAULT 0,
        replies INT DEFAULT 0,
        is_edited BOOL DEFAULT false,
        is_sticky BOOL DEFAULT false,
        PRIMARY KEY (id),
        FOREIGN KEY (parent_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
')
POSTS_OWNER=$($PSQL 'ALTER TABLE posts OWNER TO fem39')
if [[ ($USERS = "CREATE TABLE") && ($USERS_OWNER = "ALTER TABLE") ]]
    then echo "TABLE: posts --> $OWNER"
fi

UPVOTES=$($PSQL '
    CREATE TABLE upvotes (
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        is_up BOOL NOT NULL,
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
')
UPVOTES_OWNER=$($PSQL 'ALTER TABLE upvotes OWNER TO fem39')
if [[ ($UPVOTES = "CREATE TABLE") && ($UPVOTES_OWNER = "ALTER TABLE") ]]
    then echo "TABLE: upvotes --> $OWNER"
fi

COUNT_VOTES=$($PSQL '
    CREATE FUNCTION count_votes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
	BEGIN
		WITH sum AS
			(SELECT SUM(CASE is_up WHEN TRUE THEN 1 WHEN FALSE THEN -1 ELSE 0 END) AS votes
			FROM upvotes 
			WHERE post_id = COALESCE(NEW.post_id, OLD.post_id))
		UPDATE posts SET votes = COALESCE(sum.votes, 0)
		FROM sum
		WHERE id = COALESCE(NEW.post_id, OLD.post_id);
		RETURN NEW;
	END;
	$$;
')
COUNT_VOTES_OWNER=$($PSQL 'ALTER FUNCTION count_votes() OWNER TO fem39')
NEW_UPVOTE=$($PSQL '
    CREATE TRIGGER new_upvote
    AFTER INSERT OR UPDATE OR DELETE ON upvotes
    FOR EACH ROW EXECUTE FUNCTION count_votes()
')
if [[ ($COUNT_VOTES = "CREATE FUNCTION") && ($COUNT_VOTES_OWNER=="ALTER FUNCTION" && $NEW_UPVOTE=="CREATE TRIGGER") ]]
    then echo "TRIGGER: new_upvote --> $OWNER"
fi

COUNT_REPLIES=$($PSQL '
    CREATE FUNCTION count_replies() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
	BEGIN
		WITH sum AS
			(SELECT COUNT(id) AS replies
			FROM posts 
			WHERE parent_id = NEW.parent_id)
		UPDATE posts SET replies = sum.replies
		FROM sum
		WHERE id = NEW.parent_id;
		RETURN NEW;
	END;
	$$;
')
COUNT_REPLIES_OWNER=$($PSQL 'ALTER FUNCTION count_replies() OWNER TO fem39')
NEW_REPLY=$($PSQL '
    CREATE TRIGGER new_reply
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION count_replies()
')
if [[ ($COUNT_REPLIES = "CREATE FUNCTION") && ($COUNT_REPLIES_OWNER = "ALTER FUNCTION" && $NEW_REPLY = "CREATE TRIGGER") ]]
    then echo "TRIGGER: new_reply --> $OWNER"
fi

INSERT_DELETED_USER=$($PSQL "INSERT INTO users (name) VALUES ('')")
if [[ ( $INSERT_DELETED_USER = 'INSERT 0 1' ) ]]
	then echo "USER: 'deleted'"
fi

echo

USERS_ADDED=0
POSTS_ADDED=0
{
    read
    while IFS="|" read -r ID TEXT PARENT_ID DATE NAME
    do
        INSERT_USER_RESULT=$($PSQL "
            WITH cte_1 AS (
                SELECT *, 0 AS is_new FROM users
                WHERE name = '$NAME'
            ),
            cte_2 AS (
                INSERT INTO users (name)
                SELECT '$NAME'
                WHERE NOT EXISTS (SELECT '$NAME' FROM cte_1 WHERE name='$NAME')
                RETURNING id, 1 AS is_new
            )
            SELECT id, is_new FROM cte_1
            UNION ALL
            SELECT id, is_new FROM cte_2
        ")

        IFS="|" read USER_ID IS_NEW <<< $INSERT_USER_RESULT

        if [[ ($IS_NEW -eq 1) ]]
        then
            USERS_ADDED=$(($USERS_ADDED+1))
        fi
        
        if [[ -z $PARENT_ID ]]
        then 
            INSERT_POST_RESULT=$($PSQL "
                INSERT INTO posts (user_id, text, date)
                VALUES ($USER_ID, '$TEXT', '$DATE')
            ")
        else
            INSERT_POST_RESULT=$($PSQL "
                INSERT INTO posts (parent_id, user_id, text, date)
                VALUES ($PARENT_ID, $USER_ID, '$TEXT', '$DATE')
            ")        
        fi
        if [[ ($INSERT_POST_RESULT = "INSERT 0 1") ]]
        then
            POSTS_ADDED=$(($POSTS_ADDED+1))
        fi
        
	echo -ne "added $USERS_ADDED users and $POSTS_ADDED posts"\\r
    done    
} < data.csv

echo

INSERT_SAHAND_RESULT=$($PSQL "
    INSERT INTO users (name, github_id, avatar_url, url)
    VALUES (
        'Sahand Masoleh',
        63850404,
        'https://avatars.githubusercontent.com/u/63850404?v=4',
        'https://github.com/sahand-masoleh'
        )
    RETURNING id
")
IFS="|" read SAHAND_ID <<< $INSERT_SAHAND_RESULT
echo "USER: 'SAHAND', ID:" $SAHAND_ID 

UPVOTES_ADDED=0
{
    read
    while IFS="|" read -r USER_ID POST_ID IS_UP
    do
        INSERT_UPVOTE_RESULT=$($PSQL "
            INSERT INTO upvotes (post_id, user_id, is_up)
            VALUES($POST_ID, $USER_ID, $IS_UP)
        ")
    
    if [[ ( $INSERT_UPVOTE_RESULT = 'INSERT 0 1' ) ]]
	then UPVOTES_ADDED=$(($UPVOTES_ADDED+1))
    fi

	echo -ne "added $UPVOTES_ADDED upvotes"\\r
    done
} < upvotes.csv

echo -e "\n"

INSERT_SAHAND_POST=$($PSQL "
    INSERT INTO posts (user_id, text, is_sticky)
    VALUES(
        $SAHAND_ID,
        'Hey everyone!
        Thank you for checking out my project, I would appreciate it if you left a comment and told me what you think of the result.
        Enjoy, and have a nice day! ;)',
        true
    )
")
if [[ ($INSERT_SAHAND_POST = "INSERT 0 1") ]]
    then echo "INTRO POST --> SAHAND"
fi

echo