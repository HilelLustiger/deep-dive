"""Test infrastructure (provided): a local web server for the tests.

Any test that takes a `base_url` parameter gets a fresh server on a free
port, for example "http://127.0.0.1:54321". Routes:

    /ok                 200 immediately
    /slow/{seconds}     waits, then 200
    /status/{code}      responds immediately with that status code
"""

import asyncio

import pytest
from aiohttp import web


async def ok(request):
    return web.Response(text="ok")


async def slow(request):
    await asyncio.sleep(float(request.match_info["seconds"]))
    return web.Response(text="slow")


async def status(request):
    return web.Response(status=int(request.match_info["code"]))


@pytest.fixture
async def base_url():
    app = web.Application()
    app.router.add_get("/ok", ok)
    app.router.add_get("/slow/{seconds}", slow)
    app.router.add_get("/status/{code}", status)

    runner = web.AppRunner(app, handler_cancellation=True, shutdown_timeout=0)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]

    yield f"http://127.0.0.1:{port}"

    await runner.cleanup()
