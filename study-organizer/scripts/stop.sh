#!/usr/bin/env bash
set -e

if lsof -i :8080 -t >/dev/null 2>&1; then
  kill -9 $(lsof -i :8080 -t) || true
fi
