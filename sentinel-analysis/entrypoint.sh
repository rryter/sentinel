#!/bin/bash
set -e

# Fix permissions for mounted volumes
chown -R appuser:root /app/results
chmod -R 777 /app/results
chmod g+s /app/results

# Switch to appuser
exec gosu appuser "$@" 