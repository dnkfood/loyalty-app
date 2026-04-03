#!/bin/bash
# Set NODE_ENV=production in the process environment file so Gradle picks it up
echo "export NODE_ENV=production" >> "$HOME/.bashrc"
export NODE_ENV=production
echo "NODE_ENV=production set for build phases"
