"""Part 1: delayed, async_timed, run_one_by_one, run_as_tasks."""


import asyncio
import time


async def delayed(value, seconds):
    await asyncio.sleep(seconds)
    return value


def async_timed(coro):
    async def wrapper(*args, **kwargs):
        start = time.perf_counter()
        output = await coro(*args, **kwargs)
        end = time.perf_counter()
        wrapper.last_elapsed = end - start
        return output
    wrapper.last_elapsed = None
    return wrapper


@async_timed
async def run_one_by_one(seconds_list):
    results = []
    for second in seconds_list:
        res = await delayed(second, second)
        results.append(res)
    return results


@async_timed
async def run_as_tasks(seconds_list):
    tasks = [asyncio.create_task(delayed(second, second)) for second in seconds_list]
    results = [await task for task in tasks]
    return results
