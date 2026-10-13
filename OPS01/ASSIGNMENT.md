# Assignment OPS01 — Containers and CI/CD (Python)

**Topics:** images and containers, layers and the build cache, `CMD` and signals, port publishing, Compose, service discovery, internal networks, volumes, healthchecks, configuration through the environment, GitHub Actions workflows, service containers, dependency caching, registries and image tags

## Introduction

In this assignment you will take a small web service from "it runs on my machine" to "every merge to `main` produces a tested, versioned image that any server can pull and run".

The service itself is deliberately tiny: a FastAPI app that stores and returns items. The work is everything around it. You will package it as a **container image**, run it next to a Postgres database with **Docker Compose**, write a **CI** pipeline that lints, tests and builds it on every change, and finish with a **CD** step that publishes the image to a registry.

Each part adds one layer on top of the previous one, in the same folder. By the end you should be able to explain every DevOps-related file in a real project: what it does, and what breaks without it.

The assignment has five parts. Do them in order, and check off each part's "Done when" list before moving to the next one.

Names given in **bold code** are required. Everything else is up to you.

### Proof instead of tests

Parts 0–2 have ordinary pytest tests. But much of this assignment can't be checked by pytest: that a layer was cached, that a port is closed, that a failing test blocks a pull request. For those, each part has a **Verify by hand** list. For every item, run the command, and paste the command and the relevant lines of its output into a **Verification log** section in `README.md`. An item counts as done only when its evidence is in the log.

### This repository is a monorepo

Two things work differently here than in the tutorials, because this project is one folder inside a bigger repository:

- **GitHub only reads workflows from `.github/workflows/` at the repository root**, not from this folder. Your workflow file lives there, and has to point at this folder explicitly. Part 3 explains how.
- **`.gitignore` is at the repository root.** Add entries there.

### Versions

Use Python **3.12** everywhere: the local virtual environment (`python3.12 -m venv .venv`; the system `python3` on macOS is too old for current FastAPI), the image (`python:3.12-slim`) and CI. Use `postgres:17` for the database.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write anything, not to know the solution.

1. **Docker concepts — [What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)** and **[What is an image?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)**
   The two words everything else is built on: an image is a read-only package of files and configuration, and a container is a running process started from it. Also how a container differs from a virtual machine.
   *Part 1.*
2. **Docker concepts — [Understanding the image layers](https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/)**, **[Writing a Dockerfile](https://docs.docker.com/get-started/docker-concepts/building-images/writing-a-dockerfile/)** and **[Using the build cache](https://docs.docker.com/get-started/docker-concepts/building-images/using-the-build-cache/)**
   An image is a stack of layers, one per instruction. The instructions you need (`FROM`, `WORKDIR`, `COPY`, `RUN`, `CMD`), and the rule that decides when a layer is rebuilt and when it's reused.
   *Part 1.*
3. **[FastAPI in Containers – Docker](https://fastapi.tiangolo.com/deployment/docker/)**, from the top through "Containers and Processes" only.
   The same concepts from the application's side: why a container lives exactly as long as its main process. The rest of the page builds a Dockerfile very close to Part 1's, so read it after you've written yours.
   *Part 1.*
4. **FastAPI tutorial — [First Steps](https://fastapi.tiangolo.com/tutorial/first-steps/)**, **[Path Parameters](https://fastapi.tiangolo.com/tutorial/path-params/)**, **[Handling Errors](https://fastapi.tiangolo.com/tutorial/handling-errors/)** and **[Testing](https://fastapi.tiangolo.com/tutorial/testing/)**
   Enough FastAPI for this assignment: a route, a typed path parameter, returning 404 with `HTTPException`, and calling the app from pytest with `TestClient`.
   *Parts 0–1.*
5. **Docker concepts — [Publishing and exposing ports](https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/)**
   A container has its own network. `-p HOST:CONTAINER` is what makes one of its ports reachable from your machine.
   *Parts 1 and 2.*
6. **Docker concepts — [What is Docker Compose?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-docker-compose/)**
   One file that describes several containers and how they connect, instead of several long `docker run` commands.
   *Part 2.*
7. **[Networking in Compose](https://docs.docker.com/compose/how-tos/networking/)**, sections "Default network and service discovery", "Specify custom networks" and "Internal networks".
   How services find each other by name, the difference between `HOST_PORT` and `CONTAINER_PORT`, and what `internal: true` cuts off.
   *Part 2.*
8. **[Control startup and shutdown order in Compose](https://docs.docker.com/compose/how-tos/startup-order/)**
   Why "started" is not "ready", and how `depends_on` with a healthcheck closes the gap.
   *Part 2.*
9. **Docker concepts — [Persisting container data](https://docs.docker.com/get-started/docker-concepts/running-containers/persisting-container-data/)**
   What happens to a container's files when it's removed, and what a volume is. The example uses Postgres.
   *Part 2.*
10. **[Environment variables: best practices](https://docs.docker.com/compose/how-tos/environment-variables/best-practices/)** (Compose)
    Where configuration comes from, in what order of precedence, and why secrets need more care than other settings.
    *Part 2.*
11. **[psycopg 3 — Basic module usage](https://www.psycopg.org/psycopg3/docs/basic/usage.html)**
    Connecting to Postgres from Python, running a query with parameters, and what `with` does to a connection.
    *Part 2.*
12. **FastAPI — [Request Body](https://fastapi.tiangolo.com/tutorial/body/)** and **[Lifespan Events](https://fastapi.tiangolo.com/advanced/events/)**
    Reading a JSON body into a model, and running code once when the app starts.
    *Part 2.*
13. **[Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)**
    The six words of a pipeline: workflow, event, job, step, action, runner.
    *Part 3.*
14. **[Building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python)** (GitHub docs), through "Using Ruff to lint and/or format code".
    A complete Python workflow: checking out the code, choosing a Python version, installing and caching dependencies, running pytest and Ruff.
    *Part 3.*
15. **[Creating PostgreSQL service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)**, section "Running jobs directly on the runner machine".
    How a job gets a real database for the duration of its run, and which hostname and port reach it.
    *Part 3.*
16. **Docker concepts — [What is a registry?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-registry/)**
    Where images live between the machine that builds them and the machine that runs them, and how an image name is put together: registry, repository, tag.
    *Part 4.*
17. **[Continuous deployment](https://docs.github.com/en/actions/get-started/continuous-deployment)** and **[Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)**, section "Publishing images to GitHub Packages".
    What CD adds on top of CI, and the steps of a publish job: log in, compute tags, build and push.
    *Part 4.*

### Going deeper

The sources this assignment is based on:

- **[FastAPI in Containers – Docker](https://fastapi.tiangolo.com/deployment/docker/)**, the rest of the page: "Build a Docker Image for FastAPI" through "Deployment Concepts". Compare its Dockerfile with yours.
- **[Docker — Get started](https://docs.docker.com/get-started/)**: the Docker concepts series the items above are taken from.
- ***Docker Deep Dive*** by Nigel Poulton (not free). The same ground as the Docker docs, with more on what the engine does underneath.

Images:

- **[Building best practices](https://docs.docker.com/build/building/best-practices/)**. Multi-stage builds, `.dockerignore`, `USER`, and guidance for each Dockerfile instruction. The optional items in Part 1 come from here.
- **[Multi-stage builds](https://docs.docker.com/get-started/docker-concepts/building-images/multi-stage-builds/)**. Separating the tools needed to build from the files needed to run.
- **[Dockerfile reference](https://docs.docker.com/reference/dockerfile/)**. Exact semantics of every instruction, including shell form vs. exec form and how `CMD` and `ENTRYPOINT` combine.
- **[Build context](https://docs.docker.com/build/concepts/context/)**. What the `.` at the end of `docker build` actually sends to the builder, and what `.dockerignore` removes from it.
- **[Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)**. Why an image built on a CI runner and an image built on an Apple Silicon Mac aren't interchangeable. Relevant to the last item of Part 4.

Compose:

- **[Compose file reference — services](https://docs.docker.com/reference/compose-file/services/)**. Every key you use in `compose.yaml`, with all its forms.
- **[Compose FAQ](https://docs.docker.com/compose/support-and-feedback/faq/)**, "Why do my services take 10 seconds to recreate or stop?". The signal problem from Parts 1 and 2, from Compose's side.
- **[The Twelve-Factor App — Config](https://12factor.net/config)**. The one-page argument for keeping configuration in the environment and out of the code.
- **[Docker Hub — postgres](https://hub.docker.com/_/postgres)**. The image's environment variables, where it keeps its data, and its initialization scripts.

GitHub Actions:

- **[Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)**. The reference for `on`, `needs`, `if`, `defaults`, `permissions` and `services`.
- **[Dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)** and the **[setup-python README](https://github.com/actions/setup-python)**. How a cache key is computed and when a cache is restored; the README documents `cache` and `cache-dependency-path`.
- **[Using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)** and **[GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)**. Where real credentials go, and the temporary token every run gets for free.
- **[Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)**. Authentication, visibility and naming rules of `ghcr.io`.
- **[Adding a workflow status badge](https://docs.github.com/en/actions/how-tos/monitor-workflows/add-a-status-badge)**.

---

## Part 0 — Project setup

Set up the project in this folder:

- `requirements.txt` with what the service needs to **run**: `fastapi[standard]`. The `[standard]` extra brings the `fastapi` command and the Uvicorn server.
- `requirements-dev.txt` with what you need to **develop**: a first line `-r requirements.txt`, which includes the file above, then `pytest` and `ruff`.
- An `app/` package for the code, and a `tests/` folder.
- A virtual environment made with `python3.12 -m venv .venv`, with `requirements-dev.txt` installed.

The split matters from Part 1 on: the image installs only `requirements.txt`. Test tools don't belong in what you ship.

---

## Part 1 — A containerized service

**Files:** `app/main.py`, `tests/test_health.py`, `tests/test_items.py`, `Dockerfile`, `.dockerignore`

### The service

In `app/main.py`, create a FastAPI application object named **`app`** with two endpoints:

- **`GET /health`** → status 200, body `{"status": "ok"}`. Every orchestration tool, from Compose to a load balancer, asks a service "are you alive?" through an endpoint like this.
- **`GET /items/{item_id}`**, where `item_id` is an `int` → status 200, body `{"id": <item_id>, "name": "<name>"}`. For now the items come from a dictionary in the module with two or three hard-coded entries. An id that isn't in the dictionary → status 404.

Run it locally with `fastapi dev app/main.py` and open `http://localhost:8000/docs`.

### Test that:

Use `TestClient(app)` from `fastapi.testclient`.

- `GET /health` returns 200 and `{"status": "ok"}`.
- `GET /items/1` returns 200 and the item.
- `GET /items/<an id you didn't define>` returns 404.
- `GET /items/abc` returns 422. You don't write code for this: the `int` type on the parameter does it.

### The image

A `Dockerfile` is a list of instructions. Each instruction creates one **layer**, and the image is the stack of all of them. When you rebuild, Docker reuses a layer from its **cache** if the instruction and its input files haven't changed. Once one layer has to be rebuilt, **every layer after it is rebuilt too**.

That rule decides the order of instructions: things that change rarely go first, things that change often go last. Here is the idea on an unrelated Node project:

```dockerfile
FROM node:22-slim
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
CMD ["node", "src/index.js"]
```

The list of dependencies is copied and installed **before** the source code. Editing a file in `src/` invalidates only the last `COPY`, so `npm ci`, the slow step, stays cached. Had the Dockerfile started with `COPY . .`, any edit would reinstall everything.

Write a `Dockerfile` for your service that:

1. Starts `FROM python:3.12-slim`.
2. Sets a working directory with `WORKDIR`.
3. Copies `requirements.txt` only, then installs it with `pip install --no-cache-dir -r requirements.txt`.
4. Copies the `app/` folder.
5. Starts the server on port 80 with `fastapi run app/main.py --port 80`, written as a `CMD` in **exec form**.

`fastapi run` is the production counterpart of `fastapi dev`: no auto-reload, and it listens on all of the container's network interfaces instead of only `127.0.0.1`. A server that listens only on the container's own `127.0.0.1` can't be reached through a published port.

**Exec form and shell form.** `CMD` can be written two ways:

```dockerfile
CMD ["node", "src/index.js"]    # exec form: a JSON list
CMD node src/index.js           # shell form: a plain string
```

In exec form, Docker starts your program directly, and it is process number 1 (**PID 1**) in the container. In shell form, Docker starts `/bin/sh -c "node src/index.js"`, so a shell sits between Docker and your program. This matters when the container is stopped: `docker stop` sends the signal `SIGTERM` to PID 1 and waits 10 seconds for it to exit; after that it sends `SIGKILL`, which can't be handled. A server that receives `SIGTERM` finishes its in-flight requests and exits cleanly. A server that never receives it, because a shell was PID 1 and didn't pass the signal on, is killed mid-request ten seconds later.

Also write a `.dockerignore` next to the Dockerfile. It has the same syntax as `.gitignore`, and it keeps files out of the **build context**, which is the folder sent to the builder. It must exclude at least `.venv`, `__pycache__` and `.git`.

Build and run:

```
docker build -t items-api .
docker run --rm -p 8000:80 items-api
```

`-t` names the image. `-p 8000:80` publishes the container's port 80 on your machine's port 8000. `--rm` removes the container when it stops.

### Verify by hand:

- With the container running, `curl -i http://localhost:8000/health` returns `200`.
- **Cache.** Change a string in `app/main.py` and build again. In the build output, the `pip install` step is marked `CACHED`, and the `COPY app` step is not.
- **Cache, the wrong way.** Temporarily replace the two `COPY` instructions with a single `COPY . .` before the `pip install`. Build, change a string in `app/main.py`, and build again. Record whether `pip install` is `CACHED` now. Then restore the Dockerfile.
- **Build context.** `docker run --rm items-api ls -a /<your workdir>` shows no `.venv`, `.git` or `tests`.
- **Signals.** Start the container with a name: `docker run --rm -d --name items -p 8000:80 items-api`.
  1. `docker exec items cat /proc/1/cmdline | tr '\0' ' '` prints the command line of PID 1. Record it.
  2. `time docker stop items`. Record the time.
  3. Change `CMD` to shell form, rebuild, and repeat steps 1 and 2. Record both results, then restore exec form.
  
  In `README.md`, explain what you saw: which process was PID 1 in each form, and whether the stop time differed. If the two forms behaved the same on this image, say so, and say what the base image's shell must have done for that to happen. The exec form is still the one to keep, because it doesn't depend on which shell an image happens to ship.

### Done when

- [ ] All "Test that" items have a passing test
- [ ] `docker build`, then `docker run -p 8000:80`: `/health` returns 200
- [ ] A code-only change rebuilds with the dependency-install layer reported as `CACHED`
- [ ] `.dockerignore` excludes `.venv`, `__pycache__`, `.git`
- [ ] `CMD` uses exec form, and the README explains why
- [ ] Optional: a multi-stage build, or a non-root user with `USER`, following [Building best practices](https://docs.docker.com/build/building/best-practices/)

---

## Part 2 — Compose: service, Postgres, private network

**Files:** `app/db.py`, `app/main.py`, `app/worker.py`, `tests/test_items.py`, `pytest.ini`, `compose.yaml`, `.env`, `.env.example`

Now the items move into a real database, and the stack grows to three containers: `api`, `db` and a small `worker`. Starting three containers by hand, with the right networks, volumes and order, is exactly what Compose automates.

### Configuration through the environment

The service has to know where the database is, and that answer differs between your laptop, the Compose stack and CI. So it must not be written in the code. The service reads one environment variable, **`DATABASE_URL`**, of the form:

```
postgresql://<user>:<password>@<host>:<port>/<database>
```

Whoever starts the process sets the variable. The same image then runs unchanged in every environment.

### The database code

Add `psycopg[binary]` to `requirements.txt`. In `app/db.py`, write:

- **`init_db()`**: creates the table if it doesn't exist yet: `CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`.
- **`create_item(name: str) -> dict`**: inserts a row and returns `{"id": ..., "name": ...}`. `INSERT ... RETURNING id, name` gives you the generated id in the same query.
- **`get_item(item_id: int) -> dict | None`**: returns the item, or `None` if there is no such id.
- **`count_items() -> int`**.

Each function opens a connection with `psycopg.connect(os.environ["DATABASE_URL"])`, used in a `with` block, and reads `DATABASE_URL` when it's **called**, not when the module is imported. Opening a connection per call is wasteful, and real services use a connection pool, but it keeps this assignment about containers.

Always pass values to a query as parameters, never by building the SQL string yourself. On an unrelated table:

```python
conn.execute("SELECT title FROM books WHERE author = %s", (author,))
```

### The API

Change `app/main.py`:

- Remove the hard-coded dictionary. `GET /items/{item_id}` now reads from the database, with the same responses as before.
- Add **`POST /items`** with a JSON body `{"name": "<name>"}` → status 201, body `{"id": <new id>, "name": "<name>"}`.
- Call `init_db()` once at startup, in a **lifespan** function passed to `FastAPI(lifespan=...)`.
- `GET /health` stays as it is and does not touch the database.

### The worker

`app/worker.py` is a second program in the same codebase. In a real system a worker sends emails or processes a queue. Here it only shows a second process that uses the database without being reachable from outside. When run with `python -m app.worker`, it:

1. Prints `items: <count>` using `count_items()`, with `flush=True` so the line appears in the container's log immediately.
2. Waits 5 seconds, and repeats.
3. Stops cleanly when it receives `SIGTERM`.

Step 3 needs explicit code. The worker will be PID 1 in its container, and the kernel treats PID 1 specially: a signal that the process hasn't installed a handler for is **ignored**, where in any other process it would end it. Uvicorn installs a `SIGTERM` handler for you; your plain Python script doesn't. Without one, `docker compose down` will hang on the worker for 10 seconds and then kill it.

The pattern is a handler that sets a flag, and a loop that checks it. On an unrelated example:

```python
import signal
import threading

stop = threading.Event()
signal.signal(signal.SIGTERM, lambda signum, frame: stop.set())

while not stop.is_set():
    print("tick", flush=True)
    stop.wait(2)    # like time.sleep(2), but returns at once when stop is set
```

The worker does not get its own Dockerfile. It runs from the **same image** as the API with a different command. One image, two containers, two processes.

### Tests

The item tests now need a database. Split the tests into two groups:

- Tests that need nothing, such as `/health`.
- **Integration tests**, which need a running Postgres. Mark the whole file with `pytestmark = pytest.mark.integration` at the top of `tests/test_items.py`, and register the marker in a `pytest.ini`:

  ```ini
  [pytest]
  markers =
      integration: needs a running Postgres (DATABASE_URL)
  ```

`python -m pytest -m "not integration"` then runs without a database, and plain `python -m pytest` runs everything.

One detail about `TestClient`: the lifespan function runs only when the client is used as a context manager.

```python
client = TestClient(app)            # lifespan does not run
with TestClient(app) as client:     # lifespan runs on enter and on exit
```

So the `/health` test keeps using the first form and never touches the database, and the integration tests use a fixture built on the second form, so that `init_db()` has run.

For a local database to test against, start a throwaway Postgres container that is separate from the Compose stack:

```
docker run --rm -d --name items-test-db -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:17
export DATABASE_URL=postgresql://postgres:test@localhost:5432/postgres
python -m pytest
docker stop items-test-db
```

If port 5432 is already used on your machine, publish a different host port, for example `-p 5433:5432`, and use it in the URL.

### Test that:

- `POST /items` returns 201 and an item with an `id` and the name you sent.
- `GET /items/<that id>` returns the same item.
- `GET /items/<an id that doesn't exist>` returns 404.
- Two `POST`s return two different ids.
- The `/health` test still passes with `DATABASE_URL` unset: `env -u DATABASE_URL python -m pytest -m "not integration"`.

### The Compose file

Write `compose.yaml` with three services and the pieces that connect them.

**Services:**

- **`db`**: `image: postgres:17`. The image creates its user, password and database on first start from three environment variables: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
- **`api`**: `build: .`, so Compose builds the Part 1 Dockerfile. Publishes container port 80 on host port 8000.
- **`worker`**: also `build: .`, with `command: ["python", "-m", "app.worker"]`, which replaces the image's `CMD`.

`api` and `worker` each get a `DATABASE_URL` whose host is **`db`**. Inside a Compose network, every service is reachable by its service name: Compose runs a small DNS server that resolves `db` to whatever IP the database container currently has. The port in the URL is the **container** port, 5432, regardless of what is or isn't published to the host.

**Networks.** Define two:

- **`backend`**, with `internal: true`. An internal network has no route to the outside: containers on it can talk to each other and nothing else. `db`, `api` and `worker` are all attached to it.
- **`frontend`**, a normal network. Only `api` is attached to it.

`api` needs both: `backend` to reach the database, and `frontend` because a published port only works through a network that isn't internal. `db` gets **no `ports:` section at all**. This is the usual layout in production: the database is reachable by the services that need it, and by nobody else.

**Volume.** A container's filesystem is deleted with the container. Postgres keeps its data in `/var/lib/postgresql/data`, so mount a **named volume** there. A named volume is declared under a top-level `volumes:` key, lives outside any container, and survives `docker compose down`.

**Startup order.** `depends_on: [db]` only waits until the `db` container has *started*, and Postgres needs a few more seconds before it accepts connections. An API that starts in that window crashes in `init_db()`. The fix has two halves: a **healthcheck** on the service that is depended on, and a **condition** on the service that depends on it. On an unrelated pair of services:

```yaml
services:
  cache:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 2s
      retries: 15
  web:
    build: .
    depends_on:
      cache:
        condition: service_healthy
```

Compose runs the `test` command inside the container every `interval`. When it exits with 0, the service is healthy, and only then does `web` start. For Postgres, the command that reports readiness is `pg_isready -U <user> -d <database>`, and it's already in the image. Both `api` and `worker` wait for `db` this way.

**Secrets.** The database password must not appear in `compose.yaml`, which is committed. Compose automatically reads a file named `.env` next to `compose.yaml`, and substitutes `${NAME}` anywhere in the Compose file with the value from it. Create:

- **`.env`** with `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`. Add `.env` to the root `.gitignore` **before** you create the file.
- **`.env.example`**, committed, with the same keys and placeholder values, so that someone who clones the repository knows what to create.

Reference the three variables with `${...}` in both the `db` service's environment and the `DATABASE_URL` of `api` and `worker`. `docker compose config` prints the file after substitution, which is the quickest way to check it.

### Verify by hand:

- `docker compose up -d --build` starts all three services, and `docker compose ps` shows `db` as `healthy`.
- `curl -i -X POST localhost:8000/items -H 'content-type: application/json' -d '{"name":"lamp"}'` returns 201, and `curl localhost:8000/items/1` returns the item.
- `docker compose logs worker` shows `items: 1`.
- **Service discovery.** `docker compose exec api python -c "import socket; print(socket.gethostbyname('db'))"` prints an IP address. Neither that address nor any other appears anywhere in your files.
- **The database is private.** `docker compose ps` shows no published port for `db`, and `nc -z localhost 5432` fails. Stop `items-test-db` first if it's still running.
- **The backend network is internal.** `docker network inspect <project>_backend --format '{{.Internal}}'` prints `true`. `docker network ls` shows the exact name.
- **Persistence.** `docker compose down`, then `docker compose up -d`: `curl localhost:8000/items/1` still returns the item. Then `docker compose down -v`, which also deletes volumes, and `up -d` again: the same request returns 404.
- **Startup order.** In the output of `docker compose up` (without `-d`) after a `down`, the `api` container starts only after `db` is reported healthy. Then temporarily change both conditions to `service_started`, run `docker compose down -v` and `docker compose up`, and record what happens to `api`. Restore the condition.
- **Clean shutdown.** `time docker compose down` finishes in under 5 seconds. If it takes more than 10, a container is ignoring `SIGTERM`: `docker compose logs` and the order in which containers stop show which one.
- **Secrets.** `git status` does not list `.env`, and `grep -rn "<your password>" . --exclude=.env --exclude-dir=.venv` finds nothing.

### Done when

- [ ] All "Test that" items have a passing test
- [ ] `docker compose up` starts the full stack with one command
- [ ] The API connects to `db:5432` by service name, with no hard-coded IP
- [ ] `db` has no published ports and is attached only to an `internal: true` network
- [ ] Data survives `docker compose down` followed by `up`
- [ ] The API starts only after Postgres is ready (`condition: service_healthy`)
- [ ] The database password lives in `.env`, which is listed in `.gitignore`, and `.env.example` is committed
- [ ] `docker compose down` finishes in under 5 seconds

---

## Part 3 — Continuous integration with GitHub Actions

**File:** `.github/workflows/ci.yml` **at the repository root**

Everything so far ran because you remembered to run it. **Continuous integration** removes the remembering: on every change, a clean machine that isn't yours checks out the code, lints it, tests it and builds it, and reports the result on the commit and on the pull request.

### The vocabulary

A **workflow** is a YAML file in `.github/workflows/`. It names the **events** that trigger it, and contains **jobs**. Each job runs on a fresh virtual machine called a **runner**, and is a list of **steps**. A step is either a shell command (`run:`) or an **action** (`uses:`), which is a reusable step that someone else published. Jobs run in parallel unless one declares that it `needs` another.

The shape, on an unrelated project:

```yaml
name: Docs

on:
  pull_request:
  push:
    branches: [main]

defaults:
  run:
    working-directory: docs-site

jobs:
  spellcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npx cspell "**/*.md"

  links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npx linkinator .

  build:
    needs: [spellcheck, links]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npm ci && npm run build
```

Things to notice:

- **Every job starts from an empty machine.** That is why each job begins with `actions/checkout`: without it, the runner doesn't have your code.
- **`needs`** makes `build` wait for both other jobs, and skip itself if either fails.
- **`defaults.run.working-directory`** makes every `run:` step start in a subfolder. This is how a workflow at the repository root works on one project of a monorepo. It applies to `run:` steps **only**. A `uses:` step ignores it, so any path you give to an action must be written from the repository root.
- **Triggers.** `pull_request` runs on every push to a branch that has an open pull request. `push` restricted to `main` runs after a merge. A bare `on: [push, pull_request]` would run everything twice for each push to a pull request branch: once for the push, once for the pull request.

### The workflow

Write `.github/workflows/ci.yml`, named **`CI`**, triggered on `pull_request` and on `push` to `main`, with `working-directory` set to this project's folder, and three jobs:

**`lint`**

1. Check out the code.
2. Set up Python 3.12 with `actions/setup-python`.
3. Install Ruff.
4. Run `ruff check .` and `ruff format --check .`. The second one fails if any file isn't formatted, without changing it.

**`test`**

1. Declares a **service container**: a `services:` block with a `postgres:17` image, a `POSTGRES_PASSWORD`, a published port `5432:5432`, and the health options from the reading (item 15). GitHub starts it before the job's steps and removes it afterwards. Because the job's steps run directly on the runner, the database is at **`localhost:5432`**, the same situation as your local `items-test-db`.
2. Check out the code, and set up Python 3.12 with pip caching (below).
3. Install `requirements-dev.txt`.
4. Run `python -m pytest` with `DATABASE_URL` set through the step's `env:` key, pointing at the service container. This runs the integration tests too.

The password of this database can be written directly in the workflow: the database exists for a few minutes, holds no data, and is reachable only from the runner. A credential for anything real would go in the repository's **secrets** and be read as `${{ secrets.NAME }}`.

**`build`**

1. `needs` both `lint` and `test`.
2. Check out the code, and run `docker build`. Docker is already installed on the runner.

**pip caching.** `actions/setup-python` can save pip's download cache at the end of a run and restore it at the start of the next one. Enable it with `cache: pip` under the action's `with:`. The cache key is a hash of your requirements files, and the action looks for them at the repository root. Yours aren't there, and this is a `uses:` step, so `working-directory` doesn't help. Tell it where they are with `cache-dependency-path`, written from the repository root, for example `OPS01/requirements*.txt`.

### Working with pull requests

From this part on, work the way the pipeline expects: create a branch, push it, and open a pull request against `main`. The checks appear at the bottom of the pull request page, and the full logs are under the repository's **Actions** tab. With the `gh` CLI: `gh pr create`, `gh pr checks`, `gh run watch`.

### Verify by hand:

For these items, the evidence in the Verification log is a link to the workflow run.

- A pull request that adds the workflow shows three jobs, and `build` starts only after `lint` and `test` finish.
- In the `test` job's log, the integration tests ran and passed: the pytest summary counts all your tests, not only `/health`.
- **A failing test blocks the pull request.** Push a commit that breaks a test on purpose. The pull request shows a failed check, and the `build` job is skipped. Push a fix: the checks pass again.
- **A lint failure blocks it too.** Push a commit with an unused import. `lint` fails while `test` still passes, so the two jobs really are independent.
- **Caching.** In the second run of `test`, the "Set up Python" step logs that the cache was restored. Record the duration of the "install dependencies" step in the first run and in the second.
- A **status badge** for the workflow appears at the top of this project's `README.md`. The repository is private, so the badge renders only for someone logged in with access to it.

### Done when

- [ ] `.github/workflows/ci.yml` runs on `pull_request` and on `push` to `main`
- [ ] Separate `lint` (Ruff) and `test` jobs; `build` runs only if both pass
- [ ] At least one integration test runs against Postgres in CI
- [ ] A deliberately failing test marks the pull request as failed; fixing it restores a passing state
- [ ] pip caching is enabled and the second run's install step is measurably faster
- [ ] A workflow status badge appears in the README

---

## Part 4 — Continuous delivery: publishing to a registry

**File:** `.github/workflows/ci.yml`

CI answers "is this change good?". **Continuous delivery** is what happens next for a change that is: an artifact is produced and stored where a server can fetch it. For a containerized service the artifact is the image, and the storage is a **registry**. You'll use GitHub's, the **GitHub Container Registry** (GHCR), at `ghcr.io`.

### Image names and tags

A full image name has three parts:

```
ghcr.io/<owner>/<image-name>:<tag>
```

The **tag** identifies a version. `latest` is only a convention: a tag that gets moved to the newest image on every push. So "the server runs `latest`" doesn't say which code is running, and there is nothing to roll back to. A tag made from the **commit SHA** is never reused: it names exactly one build of exactly one commit. Publish with the SHA tag. Adding `latest` as a second tag is optional.

GHCR requires the owner and the image name to be **lowercase**. `${{ github.repository_owner }}` gives the owner exactly as it's written on GitHub, capitals included, so it can't be used in a tag as it is. Either write the lowercase name by hand in the workflow, or use `docker/metadata-action`, which lowercases it for you.

### The publish job

Add a fourth job, **`publish`**, to the same workflow:

1. `needs` the `build` job.
2. Runs **only for a push to `main`**: a job-level `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. On a pull request the job is skipped, so pull requests still build the image and never publish it.
3. Declares the permissions it needs:

   ```yaml
   permissions:
     contents: read
     packages: write
   ```

   Every workflow run gets a temporary token, `GITHUB_TOKEN`, that expires when the run ends. `permissions` states what that token may do. `packages: write` is what allows pushing to GHCR, and no password or personal token is stored anywhere.
4. Steps: check out the code; log in to `ghcr.io` with `docker/login-action`, with `${{ github.actor }}` as the username and `${{ secrets.GITHUB_TOKEN }}` as the password; build and push with `docker/build-push-action`, with `push: true` and a tag that ends in `${{ github.sha }}`.

`docker/build-push-action` is a `uses:` step, so give it this project's folder as its `context`, written from the repository root.

Use the current major version of each action, as shown in its README. The GitHub tutorial in the reading pins actions by full commit SHA instead, which is the stricter practice: a version tag can be moved by the action's author, and a SHA can't.

### Verify by hand:

- A pull request that adds the `publish` job shows it as **skipped**.
- After merging, the run on `main` executes `publish`, and the package appears under **Packages** on your GitHub profile with a tag equal to the merge commit's full SHA. `git rev-parse origin/main` prints the same SHA.
- **Pull it from another machine**, or after `docker image rm` of every local copy. The package is private, like the repository, so log in first: create a personal access token (classic) with the `read:packages` scope, then `docker login ghcr.io -u <your username>` and paste the token as the password. Then:

  ```
  docker pull ghcr.io/<owner>/<image-name>:<sha>
  docker run --rm -p 8000:80 ghcr.io/<owner>/<image-name>:<sha>
  ```

  `/health` returns 200. The runner built the image for `linux/amd64`. On an Apple Silicon Mac, add `--platform linux/amd64` to both commands, and Docker runs it under emulation.
- In `README.md`, a section **The next step** describes what a real deployment would add: what a server would need (credentials to pull, the Compose file, an `.env`), which commands it would run to move from one SHA to the next, and how it would roll back.

### Done when

- [ ] A push to `main` publishes a new image to GHCR tagged with the commit SHA
- [ ] Pull requests build the image but do not publish it
- [ ] `docker pull` of the published image works from a machine that didn't build it
- [ ] The README describes the next step of a real deployment

---

## Review questions

You should be able to answer each of these aloud, without notes.

| # | Question | Part |
|---|----------|------|
| 1 | What is the difference between an image and a container? | 1 |
| 2 | How does a container differ from a virtual machine? | 1 |
| 3 | Why is `requirements.txt` copied before the application code? | 1 |
| 4 | What is the difference between `RUN` and `CMD`? Between `CMD` and `ENTRYPOINT`? | 1 |
| 5 | What does `docker stop` do, step by step, and why does PID 1 matter? | 1, 2 |
| 6 | How do two services in a Compose project find each other? | 2 |
| 7 | What is the difference between `ports` and service-to-service communication? | 2 |
| 8 | What happens to data when a container is removed, and how is it persisted? | 2 |
| 9 | Does `depends_on` guarantee that the database is ready? | 2 |
| 10 | Where should secrets live, and why not in the image? | 2, 3 |
| 11 | What is the difference between CI and CD? | 3, 4 |
| 12 | What runs in the pipeline, and what happens when a test fails? | 3 |
| 13 | Why does every job start with a checkout step? | 3 |
| 14 | Why tag images by commit SHA rather than only `latest`? | 4 |

---

## Wrap up

Complete `README.md` in this folder with short sections:

- **What I learned**: a few sentences.
- **Why exec form**: your explanation from Part 1.
- **Verification log**: the commands and output for every "Verify by hand" item.
- **The next step**: your description from Part 4.
- **A design decision**: one choice you made that the assignment didn't dictate, and why.

## Running the tests

From this folder, with the virtual environment active:

```
python -m pytest -m "not integration"
```

With a Postgres running and `DATABASE_URL` set, as described in Part 2:

```
python -m pytest
```

## Done when

- [ ] Parts 0–4 are complete, and every item in each part's "Done when" list is checked
- [ ] Every "Test that" item has a passing test
- [ ] Every "Verify by hand" item has its evidence in the Verification log
- [ ] You can answer every review question aloud
- [ ] `README.md` is completed
