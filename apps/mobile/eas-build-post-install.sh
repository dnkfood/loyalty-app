#!/bin/bash
# Write NODE_ENV to /tmp/.eas-env so it persists across build phases
echo "export NODE_ENV=production" | sudo tee -a /etc/environment > /dev/null
echo "export NODE_ENV=production" >> "$HOME/.profile"
echo "export NODE_ENV=production" >> "$HOME/.bashrc"
# Also try to set it for the current process tree
echo "NODE_ENV=production" | sudo tee -a /etc/default/locale > /dev/null 2>&1 || true
echo "✅ NODE_ENV=production set in /etc/environment, .profile, .bashrc"
