FROM redis:7-alpine

# Set environment variable for Redis password
ENV REDIS_PASSWORD=${REDIS_PASSWORD}

# Create data directory
RUN mkdir -p /data/redis

# Expose Redis port
EXPOSE 6379

# Volume for persistent data
VOLUME ["/data/redis"]

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD redis-cli -a "$REDIS_PASSWORD" ping | grep PONG

# Start Redis server with password authentication
CMD ["sh", "-c", "redis-server --requirepass ${REDIS_PASSWORD}"]