#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

createdb embedded-debezium

psql embedded-debezium < $script_dir/tables.sql
