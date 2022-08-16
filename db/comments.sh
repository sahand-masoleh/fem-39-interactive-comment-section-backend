#!/bin/bash 
PSQL="psql --username=postgres --dbname=postgres -c"
_=$($PSQL "DROP DATABASE IF EXISTS comments")
_=$($PSQL "CREATE DATABASE comments")

RESTORE=$(psql --username=postgres --dbname=comments -f comments.sql)
