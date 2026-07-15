# Switchover plan: from the old app to the redesign

Status: switched on 27 Nov 2026 at about 23:25 IST. `vastu.home` serves the new app; the old container is stopped with its restart policy set to `no`. Stage 4 (homelab repo) and the one-week cleanup are still to do. Every step that changes the server, Caddy or GitHub waits for the user's go-ahead.

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
2. **UPI ID.** Optional; add it to `~/docker/vastu/config/app-settings.json` before the switch so bills carry the payment QR code from day one.

Checked on 27 Nov 2026: the main Caddy `Caddyfile` is edited by hand (only `conf.d/immich.caddy` is Ansible-managed), so the Caddy change is made directly on the Caddy host. The homelab repo still needs two edits, in Stage 4.

## Stage 1: release (no effect on the live app)

1. Push `feat/redesign-phase-1` and open a pull request into `main`. CI runs the tests, the migration check, the generated-types check and the frontend build.
2. Merge it, then back-date the merge commit and force push `main`, per `.agents/rules/git-commits.md`.
3. Tag the merge commit `v1.0.0` and push the tag. CI tests again and publishes both images as `1.0.0` and `latest`. The server pins `VASTU_TAG=1.0.0`, so a later release changes nothing until the tag in `.env` is changed.

## Stage 2: rehearsal on the server (done 27 Nov 2026)

- `~/docker/vastu` created with `compose.yml` from `v1.0.0`, `.env` (new `SECRET_KEY` generated on the server, `VASTU_TAG=1.0.0`, mode 600) and `config/app-settings.json` copied from the old folder with the new name, `upiId` and `logoFile`.
- Images pulled (api 268 MB, web 60 MB); both migrations ran; seed added 41 catalog items.
- Import on a fresh safe copy of the live database: dry run and real run both matched every client. 40 clients, 52 payments, Rs 4,65,800 billed, Rs 4,21,200 paid; `admin@test.com` carried over, the two test accounts skipped.
- `api` healthy on 8010, `web` serving on 8011, data routes refuse requests without a login.
- In-process check inside the container: Home shows Rs 60,600 across 5 properties; Girish Sawkar's bill is Rs 35,500 billed, Rs 10,000 paid, Rs 25,500 due, matching the old invoice; bill, receipt and report PDFs render with the logo and Noto Sans.
- One backup written and restored: integrity check ok, 40 clients.
- The copy of live data and the check files were deleted. The rehearsal database stays until Stage 3, which replaces it.

## Stage 3: switch (about 15 minutes of downtime)

On portress (`ssh -i ~/.ssh/homelab_key nammathalle@10.0.50.9`):

```bash
# 1. Freeze the old app. Nothing can write to the old database from here on.
cd ~/docker/vastu_vaibhav && docker compose stop

# 2. Final copy of the old database, plus a gzipped copy kept with the old backups.
sqlite3 ~/docker/vastu_vaibhav/data/vastu.db ".backup /home/nammathalle/docker/vastu/legacy-final.db"
gzip -c ~/docker/vastu/legacy-final.db > ~/docker/vastu_vaibhav/data/backups/vastu_final_before_switch.db.gz

# 3. Replace the rehearsal database with a clean import of the final copy.
cd ~/docker/vastu && docker compose stop api web && rm data/vastu.db
docker compose run --rm migrate
docker compose run --rm api python -m app.cli.seed
docker compose run --rm -v ./legacy-final.db:/legacy.db:ro api python -m app.cli.import_legacy \
  --legacy /legacy.db --skip-user test@abc.com --skip-user test@test.com
# Must end with "Import committed: all totals match." Otherwise stop and roll back.

# 4. Start the new app and wait for "healthy".
docker compose up -d api web && docker compose ps
```

On the Caddy host (`ssh -i ~/.ssh/homelab_key nammathalle@10.0.50.12`):

```bash
# 5. Back up, remove the old vastu.home block (3 lines plus braces), add the new site, validate, reload.
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.before-vastu-switch
sudo nano /etc/caddy/Caddyfile        # delete the vastu.home { ... } block
sudo tee /etc/caddy/conf.d/vastu.caddy < vastu.caddy   # contents of deploy/caddy/vastu.caddy
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl restart caddy   # admin off: reload is not possible
```

Then:

6. Check from the MacBook and from a phone on the VPN: sign in with the existing account; Home shows Rs 60,600 across 5 properties; make a bill on Girish Sawkar's property and share the PDF to WhatsApp from the phone; open a receipt and the report.
7. Add the weekly backup to the portress crontab: `0 0 * * 0 cd ~/docker/vastu && docker compose run --rm backup`.

### What happened on the day

- The old backups folder is owned by root, so the gzipped final copy went to `~/docker/vastu/backups/legacy/vastu_final_before_switch.db.gz` instead.
- The final import matched every client: 40 clients, 52 payments, Rs 4,65,800 billed, Rs 4,21,200 paid, one account.
- The central `Caddyfile` has `admin off`, so `systemctl reload caddy` cannot work. Caddy was restarted instead (`sudo systemctl restart caddy`), a one-second blip for every site. Future Caddy changes need a restart too.
- The old container had `restart: always`; it was set to `no` (`docker update --restart=no vastu_vaibhav-vastu_vaibhav-1`) so a reboot does not bring it back. Rollback still works with `docker compose up -d` in the old folder.
- The crontab line writes to `backups/backup.log`. A first backup ran by hand.

## Stage 4: homelab repo (same day)

In `~/git/homelab`, on its own branch and following that repo's `AGENTS.md`:

- `ansible/services/docker/inventory.yml`: replace the `vastu_vaibhav` stack with `name: vastu`, `dir: /home/nammathalle/docker/vastu`, and no `post_update_cmd` (the `migrate` service runs migrations itself). Until this is done, do not run `ha docker updates`: it would start the old app again and skip the new one.
- `docs/infrastructure/proxmox/sentinel/lxc-caddy-runbook.md` and `docs/infrastructure/portress/README.md`: `vastu.home` now routes `/api/*` to `10.0.50.9:8010` and everything else to `10.0.50.9:8011`, defined in `conf.d/vastu.caddy`.

With `VASTU_TAG` pinned, `ha docker updates` keeps the app on the same release; a new release still needs `VASTU_TAG` changed by hand.

## Later releases

Merge the pull request into `main`, tag the next version (`v1.1.0` for features, `v1.0.1` for fixes), push the tag, wait for CI to publish, then on portress set `VASTU_TAG` in `~/docker/vastu/.env` and run `docker compose pull && docker compose up -d`. Migrations run first, on their own. To go back, set the previous version and run the same command; take a backup first if the release had a migration.

## Rollback

Use this if anything in Stage 3 fails, or within the first week if the new app is not usable.

1. On Caddy: `sudo rm /etc/caddy/conf.d/vastu.caddy`, `sudo cp /etc/caddy/Caddyfile.before-vastu-switch /etc/caddy/Caddyfile`, validate, `sudo systemctl restart caddy`.
2. `docker compose up -d` in `~/docker/vastu_vaibhav`. The old database is exactly as it was at step 1 of Stage 3.
3. `docker compose down` in `~/docker/vastu`.

Anything entered in the new app after the switch is not in the old database. If rollback happens after real use, those entries have to be re-entered by hand; the new app's database stays in `~/docker/vastu/data` to read them from.

## After one week without problems

- Remove the old container and image: `docker compose down` in `~/docker/vastu_vaibhav`, `docker image rm ghcr.io/nammathalle/vastu_vaibhav:latest`.
- Move `~/docker/vastu_vaibhav/data` (old database and old daily backups) into `~/docker/vastu/backups/legacy/` and delete the old folder.
- Delete `data/legacy/` on the MacBook and `legacy-final.db` on the server, keeping the gzipped copy.
- Delete `backend/app/cli/import_legacy.py` and its test from the repo.
- Delete `/etc/caddy/Caddyfile.before-vastu-switch` on the Caddy host.
- Mount the Synology share on portress and point `BACKUP_DIR` at it, so backups leave the server.
- Delete the old GitHub package `vastu_vaibhav`, so nothing pulls the old image by mistake.

## Things that will look different to the users

- They sign in again once (new signing key); passwords are unchanged. Only `admin@test.com` is carried over; the two test accounts (`test@abc.com`, `test@test.com`) are left out. The father gets his own account from Settings after the switch.
- A phone that had the old app installed may show the old screen once; pulling to refresh loads the new app. The old service worker removes itself.
- The name on screen and on documents is Shree Vastu Vaibhav.
- Clients without a phone number get no WhatsApp reminder button. None of the five clients who owe money have a number saved yet.
