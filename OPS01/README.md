# Containers and CI/CD (Python)

Based on [FastAPI in Containers – Docker](https://fastapi.tiangolo.com/deployment/docker/) from the FastAPI documentation, the [Docker concepts](https://docs.docker.com/get-started/) and [Compose](https://docs.docker.com/compose/how-tos/networking/) guides from the Docker documentation, and the [GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions) tutorials on building, testing and publishing from the GitHub documentation.

A small FastAPI service taken from a local script to a published image: a Dockerfile, a Compose stack with Postgres on a private network, a CI pipeline that lints, tests and builds on every pull request, and a CD step that publishes the image to GitHub Container Registry. It covers image layers and the build cache, signals and `CMD`, service discovery, volumes, healthchecks, secrets, service containers and image tagging.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).

## Part 1: exec form vs. shell form

I started the container with each form of `CMD`, printed the command line of PID 1, and timed `docker stop`:

| `CMD` | PID 1 | `docker stop` |
|---|---|---|
| Shell form: `CMD fastapi run app/main.py --port 80` | `/bin/sh -c fastapi run app/main.py --port 80` | 10.3 s |
| Exec form: `CMD ["fastapi", "run", "app/main.py", "--port", "80"]` | `/usr/local/bin/python3.12 /usr/local/bin/fastapi run app/main.py --port 80` | 0.6 s |

In shell form there are two processes. Docker starts `sh` as PID 1, and `sh` forks a child that runs the server. In exec form there is one: Docker starts the server directly, so it is PID 1. (`fastapi` is a Python script, so the process is the Python interpreter running it.)

The difference shows when the container stops. `docker stop` sends `SIGTERM` to PID 1 only. In shell form, `sh` gets it and does nothing with it: it doesn't pass it on to the server, and as PID 1 it isn't even stopped by it. The server never learns it was asked to stop. After 10 seconds Docker sends `SIGKILL`, which kills everything in the container at once, in the middle of whatever it was doing. In exec form, the server gets `SIGTERM` itself, finishes what it's doing and exits cleanly, in under a second.

So exec form is the one to keep.

## Part 2: the Compose stack

| Check | Result |
|---|---|
| `POST /items` with `{"name":"lamp"}`, then `GET /items/1` | 201, then the item; the worker logs `items: 1` |
| `socket.gethostbyname('db')` inside `api` | `172.20.0.2`; no IP address appears in any file |
| `db` published ports, `nc -z localhost 5432` | none; connection refused |
| `ops01_backend` `Internal` | `true` |
| `down`, then `up`: `GET /items/1` | 200, the data is in the `pgdata` volume |
| `down -v`, then `up`: `GET /items/1` | 404, the volume was deleted |
| `time docker compose down` | 1.1 s |
| The password outside `.env` | not found; `git status` doesn't list `.env` |

**Startup order.** With `condition: service_healthy`, `api` started half a second after `db` first reported healthy. With `condition: service_started` and a fresh volume, `api` and `worker` started while Postgres was still initializing, and both crashed: `api` with `connection refused` in `init_db()` and `Application startup failed`, `worker` with exit code 1. `depends_on` alone only orders the containers. Only the healthcheck makes a service wait until the database actually accepts connections.

**A race between `api` and `worker`.** The first time the stack came up, `worker` crashed with `relation "items" does not exist`. Both services wait for `db`, so they start at the same moment, and the worker queried the table before the API's lifespan had created it. Each service now calls `init_db()` itself. `CREATE TABLE IF NOT EXISTS` does nothing when the table is already there, so the order no longer matters. The server shuts down gracefully, and that doesn't depend on which shell an image happens to ship. The `sh` in `python:3.12-slim` is Debian's `dash`, and it didn't hand PID 1 over to the server.

## Part 4: publishing the image

A fourth job, `publish`, runs after `build`, and only for a push to `main`. On a pull request it is skipped, so pull requests build the image but never publish it. It logs in to `ghcr.io` with the run's temporary `GITHUB_TOKEN`, whose `permissions` allow `packages: write` and nothing more, and pushes `ghcr.io/hilellustiger/ops01-items-api:<commit SHA>`. No password is stored anywhere. The owner is written in lowercase by hand, because GHCR rejects capitals and `github.repository_owner` keeps them.

## The next step

A real deployment would add a server that runs the published image.

**What the server needs:**
- Docker with the Compose plugin.
- A token with only `read:packages`, so it can pull the image and do nothing else. It is used once, with `docker login ghcr.io`.
- `compose.yaml`, with `api` and `worker` changed from `build: .` to `image: ghcr.io/hilellustiger/ops01-items-api:${TAG}`. The server doesn't build anything; it only runs what CI built.
- An `.env` with the real database password and `TAG`, the SHA to run. It lives only on the server, never in git.

**Moving to a new version:** set `TAG` in `.env` to the new SHA, then run:

```
docker compose pull
docker compose up -d
```

Compose recreates only the containers whose image changed. The volume, and so the data, stays.

**Rolling back:** put the previous SHA back in `.env` and run the same two commands. Every SHA tag still exists in the registry and always names the same build, so the old version is exactly what ran before. With only `latest` there would be nothing to go back to.

The step after that is to make CD run these commands itself: a deploy job after `publish` that connects to the server and changes `TAG`. Schema changes would also need care, because a rollback restores the old code but not the old database.
