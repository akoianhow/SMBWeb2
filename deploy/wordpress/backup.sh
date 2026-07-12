#!/usr/bin/env bash
set -euo pipefail

cd /opt/smbwordpress
set -a
source .env
set +a

backup_dir=/opt/smbwordpress/backups
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$backup_dir"

docker exec \
  -e MYSQL_PWD="$WORDPRESS_DB_ROOT_PASSWORD" \
  smb-wordpress-db \
  mariadb-dump --single-transaction --quick --lock-tables=false -uroot "$WORDPRESS_DB_NAME" \
  | gzip -9 > "$backup_dir/wordpress-$timestamp.sql.gz"

find "$backup_dir" -type f -name 'wordpress-*.sql.gz' -mtime +14 -delete
