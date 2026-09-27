import pytest
import asyncio
from checker.basics import delayed, run_one_by_one, run_as_tasks


def test_calling_delayed_without_awaiting_returns_coroutine():
    coro = delayed(1, 0)
    assert asyncio.iscoroutine(coro)


async def test_delayed_returns_value():
    res = await delayed(1, 0)
    assert res == 1


async def test_run_as_tasks_runs_concurrently():
    await run_as_tasks([0.2, 0.2, 0.2])
    assert 0.2 <= run_as_tasks.last_elapsed < 0.3


async def test_run_one_by_one_runs_sequentially():
    await run_one_by_one([0.2, 0.2, 0.2])
    assert 0.6 <= run_one_by_one.last_elapsed < 0.7