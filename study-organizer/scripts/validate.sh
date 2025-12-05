#!/usr/bin/env bash
set -e

curl -f http://localhost:8080/ping || exit 1
