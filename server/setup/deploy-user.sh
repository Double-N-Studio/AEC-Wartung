#!/usr/bin/env bash
# Creates the user GitHub Actions deploys with on the VPS.
# Run once as root:  bash deploy-user.sh "<public SSH key>"
# The matching private key goes into the GitHub repo as the secret DEPLOY_SSH_KEY.
set -euo pipefail

PUBKEY="${1:?public SSH key missing}"

id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos 'Deploy aec-wartung' deploy
usermod -aG docker deploy

install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# The compose project and the data belong to the deploy user.
install -d -o deploy -g deploy /srv/wartung /srv/wartung/data
chown -R deploy:deploy /srv/wartung

echo "Done: $(id deploy)"
