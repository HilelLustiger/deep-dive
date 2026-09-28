import pytest
import time
from checker.runner import check_sequential, check_with_gather, check_with_taskgroup


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
        assert [res.url for res in results] == urls, f"{func.__name__} returned results out of order"


async def test_taskgroup_with_malformed_url_raises_exception_group(base_url):
    urls = [f"{base_url}/slow/0.5", f"{base_url}/slow/0.2", "ftp://example.com"]
    with pytest.raises(ExceptionGroup) as exc_info:
        await check_with_taskgroup(urls, 3)
    assert exc_info.group_contains(ValueError)


async def test_gather_with_malformed_url_raises_value_error(base_url: str):
    urls = [f"{base_url}/slow/0.5", f"{base_url}/slow/0.2", "ftp://example.com"]
    with pytest.raises(ValueError):
        await check_with_gather(urls, 3)