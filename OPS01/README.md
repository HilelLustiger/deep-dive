# Containers and CI/CD (Python)

Based on [FastAPI in Containers – Docker](https://fastapi.tiangolo.com/deployment/docker/) from the FastAPI documentation, the [Docker concepts](https://docs.docker.com/get-started/) and [Compose](https://docs.docker.com/compose/how-tos/networking/) guides from the Docker documentation, and the [GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions) tutorials on building, testing and publishing from the GitHub documentation.

A small FastAPI service taken from a local script to a published image: a Dockerfile, a Compose stack with Postgres on a private network, a CI pipeline that lints, tests and builds on every pull request, and a CD step that publishes the image to GitHub Container Registry. It covers image layers and the build cache, signals and `CMD`, service discovery, volumes, healthchecks, secrets, service containers and image tagging.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
