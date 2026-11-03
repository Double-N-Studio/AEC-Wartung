#!/usr/bin/env bash
# Legt auf dem VPS den Benutzer an, mit dem GitHub Actions ausrollt.
# Einmalig als root ausführen:  bash deploy-user.sh "<öffentlicher SSH-Schlüssel>"
# Der private Schlüssel dazu kommt als Secret DEPLOY_SSH_KEY ins GitHub-Repo.
set -euo pipefail

PUBKEY="${1:?Öffentlicher SSH-Schlüssel fehlt}"

id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos 'Deploy aec-wartung' deploy
usermod -aG docker deploy

install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# Das Compose-Projekt und die Daten gehören dem Deploy-Benutzer.
install -d -o deploy -g deploy /srv/wartung /srv/wartung/data
chown -R deploy:deploy /srv/wartung

echo "Fertig: $(id deploy)"
