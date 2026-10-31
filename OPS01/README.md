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

So exec form is the one to keep. The server shuts down gracefully, and that doesn't depend on which shell an image happens to ship. The `sh` in `python:3.12-slim` is Debian's `dash`, and it didn't hand PID 1 over to the server.
