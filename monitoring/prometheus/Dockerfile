FROM prom/prometheus:latest
COPY prometheus.cloud.yml /etc/prometheus/prometheus.yml.template
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
