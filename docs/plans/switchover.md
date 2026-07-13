# Switchover plan: from the old app to the redesign

Status: planned, not started. Every step that changes the server, Caddy or GitHub waits for the user's go-ahead.

## Where things stand (checked 27 Nov 2026)

| | Old app (live) | New app |
| --- | --- | --- |
| Folder on portress (10.0.50.9) | `~/docker/vastu_vaibhav` | `~/docker/vastu` (new, side by side) |
| Containers | one: `vastu_vaibhav-vastu_vaibhav-1`, port 8000 | `migrate`, `api` on 8010, `web` on 8011, `backup` on demand; Compose project `vastu` |
| Image | `ghcr.io/nammathalle/vastu_vaibhav:latest` | `ghcr.io/nammathalle/vastu_vaibhav-api` and `-web`, published by CI from a version tag such as `v1.0.0` |
| Database | `data/vastu.db`, last change 1 Nov 2026 | `data/vastu.db`, schema from Alembic, data from the one-time import |
| Settings | `backend/.env`, `config/app-settings.json` | `.env`, `config/app-settings.json` (name now Shree Vastu Vaibhav) |
| Backups | daily, made inside the old container, kept in `data/backups` | weekly from the host crontab, Sunday 00:00 IST, last 4 kept |
| Caddy (10.0.50.12) | `vastu.home { tls internal; reverse_proxy 10.0.50.9:8000 }` in the main `Caddyfile` | `conf.d/vastu.caddy`: `/api/*` to 8010, everything else to 8011 |

Also checked: ports 8010 and 8011 are free, the server is logged in to ghcr.io, the server clock is IST, there is 221 GB free, and no Synology share is mounted yet.

The old app is never changed or deleted during the switch. Rolling back means pointing Caddy at it again.

## Decisions needed before starting

1. **When.** About 15 minutes when nobody is entering data. The father should know the app is briefly down and that he will need to sign in again with the same password.
2. **Caddy file.** The `vastu.home` block is in the main `Caddyfile`. Recommended: remove it there and add `conf.d/vastu.caddy`, like frigate, immich and ntopng. If Ansible manages the main `Caddyfile`, the same change goes into the Ansible files, or Ansible will put the old block back.
3. **UPI ID.** Optional; add it to `config/app-settings.json` before the switch so bills carry the payment QR code from day one.

## Stage 1: release (no effect on the live app)

1. Push `feat/redesign-phase-1` and open a pull request into `main`. CI runs the tests, the migration check, the generated-types check and the frontend build.
2. Merge it, then back-date the merge commit and force push `main`, per `.agents/rules/git-commits.md`.
3. Tag the merge commit `v1.0.0` and push the tag. CI tests again and publishes both images as `1.0.0` and `latest`. The server pins `VASTU_TAG=1.0.0`, so a later release changes nothing until the tag in `.env` is changed.

## Stage 2: rehearsal on the server (live app keeps running)

1. Create `~/docker/vastu` with `compose.yml`, `.env` (new `SECRET_KEY` from `openssl rand -hex 32`, `VASTU_TAG=1.0.0`), `config/app-settings.json` (copied from the old folder, name changed to Shree Vastu Vaibhav, `upiId` and `logoFile` added) and empty `data/` and `backups/`.
2. `docker compose pull`, then `docker compose run --rm migrate`, then `docker compose run --rm api python -m app.cli.seed`.
3. Take a fresh safe copy of the live database with `sqlite3 data/vastu.db ".backup ..."` and run the import with `--dry-run --skip-user test@abc.com --skip-user test@test.com`. It must report that all totals match (last check: Rs 4,65,800 billed, Rs 4,21,200 paid, 40 clients).
4. Run the import for real into the rehearsal database, start `api` and `web`, and check them without touching `vastu.home`:
   - the containers directly: `curl http://10.0.50.9:8010/api/health` and `curl -I http://10.0.50.9:8011/`;
   - optionally, a temporary `vastu-next.home` site in Caddy with the new routing, opened from the Mac through a hosts-file entry, to try sign-in, a bill PDF and a receipt PDF on real data.
5. Render one bill and one report PDF inside the container to confirm fonts and the logo on the server.
6. Stop the rehearsal stack and delete its `data/vastu.db`. Nothing from the rehearsal is kept.

## Stage 3: switch (about 15 minutes of downtime)

1. `docker compose stop` in `~/docker/vastu_vaibhav`. From now on nobody can write to the old database.
2. Take the final copy: `sqlite3 ~/docker/vastu_vaibhav/data/vastu.db ".backup /home/nammathalle/docker/vastu/legacy-final.db"`, and keep a gzipped copy next to the old backups.
3. In `~/docker/vastu`: `docker compose run --rm migrate`, `docker compose run --rm api python -m app.cli.seed`, then `docker compose run --rm -v ./legacy-final.db:/legacy.db:ro api python -m app.cli.import_legacy --legacy /legacy.db --skip-user test@abc.com --skip-user test@test.com`. The import refuses to commit if any client's totals differ.
4. `docker compose up -d api web` and wait for the API health check to pass.
5. On Caddy: remove the `vastu.home` block from the main `Caddyfile` (backup first), add `conf.d/vastu.caddy` from `deploy/caddy/vastu.caddy`, run `caddy validate`, then `systemctl reload caddy`.
6. Check from the MacBook and from a phone on the VPN:
   - sign in with the existing account;
   - Home shows Rs 60,600 to collect across 5 properties;
   - open Girish Sawkar's property, make a bill, share the PDF to WhatsApp on the phone;
   - open a receipt and the report.
7. Add the backup line to the portress crontab: `0 0 * * 0 cd ~/docker/vastu && docker compose run --rm backup`, then run it once by hand and check that a `.db.gz` file appears.

## Later releases

Merge the pull request into `main`, tag the next version (`v1.1.0` for features, `v1.0.1` for fixes), push the tag, wait for CI to publish, then on portress set `VASTU_TAG` in `~/docker/vastu/.env` and run `docker compose pull && docker compose up -d`. Migrations run first, on their own. To go back, set the previous version and run the same command; take a backup first if the release had a migration.

## Rollback

Use this if anything in Stage 3 fails, or within the first week if the new app is not usable.

1. On Caddy: remove `conf.d/vastu.caddy`, restore the old `vastu.home` block from the backup, reload.
2. `docker compose up -d` in `~/docker/vastu_vaibhav`. The old database is exactly as it was at step 3.1.
3. `docker compose down` in `~/docker/vastu`.

Anything entered in the new app after the switch is not in the old database. If rollback happens after real use, those entries have to be re-entered by hand; the new app's database stays in `~/docker/vastu/data` to read them from.

## After one week without problems

- Remove the old container and image: `docker compose down` in `~/docker/vastu_vaibhav`, `docker image rm ghcr.io/nammathalle/vastu_vaibhav:latest`.
- Move `~/docker/vastu_vaibhav/data` (old database and old daily backups) into `~/docker/vastu/backups/legacy/` and delete the old folder.
- Delete `data/legacy/` on the MacBook and `legacy-final.db` on the server, keeping the gzipped copy.
- Delete `backend/app/cli/import_legacy.py` and its test from the repo.
- Remove the temporary `vastu-next.home` site and hosts entry if they were used.
- Mount the Synology share on portress and point `BACKUP_DIR` at it, so backups leave the server.
- Delete the old GitHub package `vastu_vaibhav`, so nothing pulls the old image by mistake.

## Things that will look different to the users

- They sign in again once (new signing key); passwords are unchanged. Only `admin@test.com` is carried over; the two test accounts (`test@abc.com`, `test@test.com`) are left out. The father gets his own account from Settings after the switch.
- A phone that had the old app installed may show the old screen once; pulling to refresh loads the new app. The old service worker removes itself.
- The name on screen and on documents is Shree Vastu Vaibhav.
- Clients without a phone number get no WhatsApp reminder button. None of the five clients who owe money have a number saved yet.
