#!/usr/bin/env bash
set -e

cd /opt/study-organizer

# Stop any existing process on port 8080 to avoid conflicts
if lsof -i :8080 -t >/dev/null 2>&1; then
  kill -9 $(lsof -i :8080 -t) || true
fi

nohup java -jar /opt/study-organizer/*.jar >/var/log/study-organizer.log 2>&1 &
