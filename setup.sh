#!/bin/sh
# Creates .env with random secrets (mode 600). Safe to run again: it never overwrites an existing .env.
set -eu
cd "$(dirname "$0")"
rand() { head -c 24 /dev/urandom | base64 | tr -d '/+=\n' | head -c 32; }
if [ -f .env ]; then echo ".env already exists, leaving it alone."; exit 0; fi
umask 077
sed -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(rand)/" -e "s/^SCRAPER_KEY=.*/SCRAPER_KEY=$(rand)/" .env.example > .env
chmod 600 .env
cat <<MSG
Created .env with random secrets.

Next:
  docker compose up -d
  open http://localhost:8787   (first visit: choose your password)
  Settings -> Connections: enter your Wise token and bank logins

Back up the encryption key somewhere safe (password manager):
  docker compose exec app cat /data/app.key
MSG
