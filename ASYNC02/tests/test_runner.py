import pytest
import time
import asyncio
from checker.runner import (
    check_sequential,
    check_with_gather,
    check_with_taskgroup,
    check_as_completed,
    check_with_deadline,
    check_limited,
)


async def test_sequential_takes_the_sum_of_request_times(base_url: str):
    start = time.perf_counter()
    urls = [f"{base_url}/slow/1"] * 3
    await check_sequential(urls, 3)
    end = time.perf_counter()
    assert 3 <= end - start < 3.5


async def test_gather_and_taskgroup_take_the_time_of_the_slowest_request(base_url: str):
    urls = [f"{base_url}/slow/1"] * 3

    start_gather = time.perf_counter()
    await check_with_gather(urls, 3)
    end_gather = time.perf_counter()

    start_tg = time.perf_counter()
    await check_with_taskgroup(urls, 3)
    end_tg = time.perf_counter()

    assert 1 <= end_gather - start_gather < 1.5
    assert 1 <= end_tg - start_tg < 1.5


async def test_all_runners_return_results_in_input_order(base_url: str):
    urls = [f"{base_url}/slow/0.5", f"{base_url}/slow/0.2", f"{base_url}/ok"]
    funcs = [check_sequential, check_with_gather, check_with_taskgroup]

    for func in funcs:
        results = await func(urls, 3)
        assert [res.url for res in results] == urls, (
            f"{func.__name__} returned results out of order"
        )


async def test_taskgroup_with_malformed_url_raises_exception_group(base_url):
    urls = [f"{base_url}/slow/0.5", f"{base_url}/slow/0.2", "ftp://example.com"]
    with pytest.raises(ExceptionGroup) as exc_info:
        await check_with_taskgroup(urls, 3)
    assert exc_info.group_contains(ValueError)


async def test_gather_with_malformed_url_raises_value_error(base_url: str):
    urls = [f"{base_url}/slow/0.5", f"{base_url}/slow/0.2", "ftp://example.com"]
    with pytest.raises(ValueError):
        await check_with_gather(urls, 3)


async def test_yields_results_in_completion_order(base_url: str):
    urls = [f"{base_url}/slow/1", f"{base_url}/ok", f"{base_url}/slow/0.5"]
    results = []
    async for res in check_as_completed(urls, 3):
        results.append(res.url)
    assert results == [f"{base_url}/ok", f"{base_url}/slow/0.5", f"{base_url}/slow/1"]


async def test_as_completed_yields_first_result_immediately(base_url: str):
    urls = [f"{base_url}/slow/1", f"{base_url}/ok", f"{base_url}/slow/0.5"]
    start = time.perf_counter()
    async for res in check_as_completed(urls, 3):
        break
    end = time.perf_counter()
    assert 0 <= end - start < 0.2


async def test_deadline_separates_finished_results_from_unfinished_urls(base_url: str):
    urls = [f"{base_url}/ok", f"{base_url}/slow/0.2", f"{base_url}/slow/3"]
    results, unfinished = await check_with_deadline(urls, 4, 1)
    assert set([res.url for res in results]) == set(
        [f"{base_url}/ok", f"{base_url}/slow/0.2"]
    )
    assert unfinished == [f"{base_url}/slow/3"]


async def test_deadline_returns_when_the_deadline_expires(base_url: str):
    urls = [f"{base_url}/ok", f"{base_url}/slow/0.2", f"{base_url}/slow/3"]
    start = time.perf_counter()
    await check_with_deadline(urls, 4, 1)
    end = time.perf_counter()
    assert 0 <= end - start < 1.2


async def test_deadline_cancels_unfinished_tasks(base_url: str):
    urls = [f"{base_url}/slow/6"]
    await check_with_deadline(urls, 5, 0.5)
    pending = [
        task
        for task in asyncio.all_tasks()
        if task.get_coro().__qualname__ == "check_url"
    ]
    assert pending == []


async def test_limited_runs_in_batches_of_max_concurrent(base_url: str):
    urls = [f"{base_url}/slow/0.5"] * 4
    start = time.perf_counter()
    await check_limited(urls, 5, 2)
    end = time.perf_counter()
    assert 1 <= end - start < 1.2


async def test_limited_runs_all_at_once_when_limit_allows(base_url: str):
    urls = [f"{base_url}/slow/0.5"] * 4
    start = time.perf_counter()
    await check_limited(urls, 5, 4)
    end = time.perf_counter()
    assert 0.5 <= end - start < 0.7
