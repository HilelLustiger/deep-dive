import asyncio
import time


def slow_lookup(seconds: float) -> float:
    time.sleep(seconds)
    return seconds


async def lookup_blocking(seconds: float) -> float:
    return slow_lookup(seconds)


async def lookup_in_thread(seconds: float) -> float:
    res = await asyncio.to_thread(slow_lookup, seconds)
    return res
