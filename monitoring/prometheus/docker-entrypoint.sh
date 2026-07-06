#!/bin/sh
set -e

: "${BACKEND_TARGET:?BACKEND_TARGET env var must be set (e.g. homelytics-backend-production.onrender.com)}"

sed "s|__BACKEND_TARGET__|${BACKEND_TARGET}|g" /etc/prometheus/prometheus.yml.template > /etc/prometheus/prometheus.yml

exec /bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus "$@"
