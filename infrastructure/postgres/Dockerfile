FROM postgres:16-alpine

# Set environment variables
ENV POSTGRES_USER=${POSTGRES_USER} \
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
    POSTGRES_DB=${POSTGRES_DB}

# Create data directory
RUN mkdir -p /data/postgres

# Expose PostgreSQL port
EXPOSE 5432

# Volume for persistent data
VOLUME ["/data/postgres"]

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-personal_assistant}

# Default PostgreSQL entrypoint from base image will run