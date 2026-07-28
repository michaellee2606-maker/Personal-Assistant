FROM redis:7-alpine

# Set environment variable for Redis password (used by redis-server at runtime)
ENV REDIS_PASSWORD=${REDIS_PASSWORD}

# Create data directory
RUN mkdir -p /data/redis

# Expose Redis port
EXPOSE 6379

# Volume for persistent data
VOLUME ["/data/redis"]

# Health check: verify the server responds to AUTH + PING
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD redis-cli --pass "${REDIS_PASSWORD}" ping | grep -q PONG

# Start the Redis server with password authentication and AOF persistence
CMD ["sh", "-c", "redis-server --requirepass \"${REDIS_PASSWORD}\" --appendonly yes --dir /data/redis"]