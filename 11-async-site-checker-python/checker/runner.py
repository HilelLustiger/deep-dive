from .models import CheckResult
from .fetch import check_url
import aiohttp
import asyncio
from collections.abc import AsyncIterator


async def check_sequential(urls: list[str], timeout: float) -> list[CheckResult]:
    async with aiohttp.ClientSession() as session:
        res = [await check_url(session, url, timeout) for url in urls]
        return res


async def check_with_gather(urls: list[str], timeout: float) -> list[CheckResult]:
    async with aiohttp.ClientSession() as session:
        res = await asyncio.gather(*[check_url(session, url, timeout) for url in urls])
        return res


async def check_with_taskgroup(urls: list[str], timeout: float) -> list[CheckResult]:
    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(check_url(session, url, timeout)) for url in urls]
        return [task.result() for task in tasks]


async def check_as_completed(urls: list[str], timeout: float) -> AsyncIterator[CheckResult]:
    async with aiohttp.ClientSession() as session:
        coros = [check_url(session, url, timeout) for url in urls]
        for next_done in asyncio.as_completed(coros):
            res = await next_done
            yield res