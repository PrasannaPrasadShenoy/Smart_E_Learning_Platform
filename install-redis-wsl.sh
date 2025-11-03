#!/bin/bash
# Run this in WSL to install Redis

echo "Updating package list..."
sudo apt update

echo "Installing Redis..."
sudo apt install -y redis-server

echo "Starting Redis service..."
sudo service redis-server start

echo "Checking Redis status..."
sudo service redis-server status

echo "Testing Redis connection..."
redis-cli ping

echo "✅ Redis is installed and running!"
echo "To start Redis in the future, run: sudo service redis-server start"
echo "To stop Redis, run: sudo service redis-server stop"

