from .models import CheckResult
from .fetch import check_url
import aiohttp
import asyncio


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
