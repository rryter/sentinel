# syntax=docker/dockerfile:1
# check=error=true

# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t sentinel_backend .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name sentinel_backend sentinel_backend

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.2

# Development stage
FROM ruby:$RUBY_VERSION-slim AS development

# Install system dependencies
RUN apt-get update -qq && \
    apt-get install -y \
    build-essential \
    libpq-dev \
    nodejs \
    libyaml-dev \
    curl \
    gdb \
    git && \
    rm -rf /var/lib/apt/lists/*

# Enable remote debugging
ENV RUBY_DEBUG_OPEN=true \
    RUBY_DEBUG_HOST=0.0.0.0 \
    RUBY_DEBUG_PORT=1234 \
    RAILS_ENV=development \
    RAILS_LOG_TO_STDOUT=true

# Set working directory
WORKDIR /app

# Copy Gemfile and install dependencies
COPY Gemfile Gemfile.lock ./
RUN gem install bundler && \
    bundle config set --local without 'production' && \
    bundle install

# Copy the rest of the application
COPY . .

# Add a simple health check endpoint
RUN echo "class ApplicationController < ActionController::Base; def health; render plain: 'OK'; end; end" > config/initializers/health_check.rb

# Install debug gem
RUN bundle add debug --group "development, test"

# Expose port
EXPOSE 3000 1234

# Add a startup script to ensure database is ready
COPY docker-entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the server with debugging enabled
CMD ["bundle", "exec", "rdbg", "-n", "--host", "0.0.0.0", "--port", "1234", "--", "/usr/local/bundle/bin/rails", "server", "-b", "0.0.0.0", "-p", "3000"]

# Production stage
FROM ruby:$RUBY_VERSION-slim AS production

# Install system dependencies
RUN apt-get update -qq && \
    apt-get install -y \
    build-essential \
    libpq-dev \
    nodejs \
    libyaml-dev \
    curl && \
    rm -rf /var/lib/apt/lists/* && \
    # Create non-root user
    useradd -m -s /bin/bash app && \
    mkdir -p /app && \
    chown -R app:app /app

# Set environment variables
ENV RAILS_ENV=production \
    RAILS_LOG_TO_STDOUT=true

# Set working directory
WORKDIR /app

# Copy Gemfile and install dependencies
COPY Gemfile Gemfile.lock ./
RUN gem install bundler && \
    bundle config set --local without 'development test' && \
    bundle install --jobs 4 --retry 3

# Copy the rest of the application
COPY --chown=app:app . .

# Set up credentials directory with proper permissions
RUN mkdir -p /app/config/credentials && \
    chown -R app:app /app/config/credentials && \
    chmod 700 /app/config/credentials

# Add a simple health check endpoint
RUN echo "class ApplicationController < ActionController::Base; def health; render plain: 'OK'; end; end" > config/initializers/health_check.rb

# Add a startup script to ensure database is ready
COPY --chown=app:app docker-entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/docker-entrypoint.sh

# Add healthcheck to match k8s probe settings
HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
