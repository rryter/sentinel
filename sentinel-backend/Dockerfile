# syntax=docker/dockerfile:1
# check=error=true

# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t sentinel_backend .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name sentinel_backend sentinel_backend

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.2
FROM ruby:$RUBY_VERSION-slim

# Install system dependencies
RUN apt-get update -qq && apt-get install -y \
    build-essential \
    libpq-dev \
    nodejs \
    openjdk-17-jdk \
    libyaml-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Gemfile and install dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy the rest of the application
COPY . .

# Add a simple health check endpoint
RUN echo "class ApplicationController < ActionController::Base; def health; render plain: 'OK'; end; end" > config/initializers/health_check.rb

# Expose port
EXPOSE 3000

# Add a startup script to ensure database is ready
COPY docker-entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the server
CMD ["rails", "server", "-b", "0.0.0.0"]
