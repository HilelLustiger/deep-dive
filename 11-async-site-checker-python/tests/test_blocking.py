import pytest
import time
import asyncio
from checker.blocking import lookup_blocking, lookup_in_thread


async def test_blocking_lookups_do_not_overlap_even_as_tasks():
    start = time.perf_counter()
    await asyncio.gather([lookup_blocking(0.3), lookup_blocking(0.3) ,lookup_blocking(0.3)])
    end = time.perf_counter()
    assert 0.6 <= end - start


async def test_lookups_in_threads_run_concurrently():
    start = time.perf_counter()
    await asyncio.gather([lookup_in_thread(0.3), lookup_in_thread(0.3) ,lookup_in_thread(0.3)])
    end = time.perf_counter()
    assert 0.3 <= end - start < 0.6