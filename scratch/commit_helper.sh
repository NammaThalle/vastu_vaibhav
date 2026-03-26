#!/bin/bash

# Usage: ./commit_helper.sh "date" "message" "file1" "file2" ...
# Date format: YYYY-MM-DD

DATE=$1
MESSAGE=$2
shift 2
FILES=$@

# Generate a random time between 05:30 and 11:30 IST (+0530)
# Hour: 05 to 11
# If hour is 05, min must be 30-59
# If hour is 11, min must be 00-30

HOUR=$(( ( RANDOM % 7 ) + 5 ))
if [ $HOUR -eq 5 ]; then
    MIN=$(( ( RANDOM % 30 ) + 30 ))
elif [ $HOUR -eq 11 ]; then
    MIN=$(( RANDOM % 31 ))
else
    MIN=$(( RANDOM % 60 ))
fi

SEC=$(( RANDOM % 60 ))

TIMESTAMP=$(printf "%s %02d:%02d:%02d +0530" "$DATE" "$HOUR" "$MIN" "$SEC")

echo "Committing at $TIMESTAMP: $MESSAGE"

git add $FILES
GIT_AUTHOR_DATE="$TIMESTAMP" GIT_COMMITTER_DATE="$TIMESTAMP" git commit -m "$MESSAGE"
