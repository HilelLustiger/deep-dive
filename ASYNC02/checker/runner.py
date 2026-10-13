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


async def check_as_completed(
    urls: list[str], timeout: float
) -> AsyncIterator[CheckResult]:
    async with aiohttp.ClientSession() as session:
        coros = [check_url(session, url, timeout) for url in urls]
        for next_done in asyncio.as_completed(coros):
            res = await next_done
            yield res


async def check_with_deadline(
    urls: list[str], timeout: float, deadline: float
) -> tuple[list[CheckResult], list[str]]:
    async with aiohttp.ClientSession() as session:
        tasks_to_urls = {
            asyncio.create_task(check_url(session, url, timeout)): url for url in urls
        }

        done, pending = await asyncio.wait(tasks_to_urls, timeout=deadline)

        if pending:
            for task in pending:
                task.cancel()

            await asyncio.wait(pending)

        results = [task.result() for task in done]
        unfinished = [tasks_to_urls[task] for task in pending]

        return (results, unfinished)


async def check_limited(
    urls: list[str], timeout: float, max_concurrent: int
) -> list[CheckResult]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def limited_check_url(session, url, timeout):
        async with semaphore:
            return await check_url(session, url, timeout)

    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(limited_check_url(session, url, timeout)) for url in urls
            ]
        return [task.result() for task in tasks]


async def check_as_completed_limited(
    urls: list[str], timeout: float, max_concurrent: int
) -> AsyncIterator[CheckResult]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def limit_func(url):
        async with semaphore:
            task = await check_url(session, url, timeout)
            return task

    async with aiohttp.ClientSession() as session:
        coros = [limit_func(url) for url in urls]
        for next_done in asyncio.as_completed(coros):
            res = await next_done
            yield res
