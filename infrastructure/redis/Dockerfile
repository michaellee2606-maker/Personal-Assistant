FROM redis:7-alpine

# Set environment variable for Redis password
ENV REDIS_PASSWORD=${REDIS_PASSWORD}

# Create data directory
RUN mkdir -p /data/redis

# Expose Redis port
EXPOSE 6379

# Volume for persistent data
VOLUME ["/data/redis"]

# Start Redis with password authentication
CMD ["redis-cli", "-a", "${REDIS_PASSWORD}"]