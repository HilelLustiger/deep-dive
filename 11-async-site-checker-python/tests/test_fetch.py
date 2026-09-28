import pytest
import aiohttp
from checker.fetch import check_url


async def test_ok_route_returns_200_and_ok(base_url: str):
    async with aiohttp.ClientSession() as session:
        url = f"{base_url}/ok"
        res = await check_url(session, url, 5)
        assert res.status == 200
        assert res.ok is True


async def test_500_response_returns_500_and_not_ok(base_url: str):
    async with aiohttp.ClientSession() as session:
        url = f"{base_url}/status/500"
        res = await check_url(session, url, 5)
        assert res.status == 500
        assert res.ok is False


async def test_slow_response_stops_at_timeout(base_url: str):
    async with aiohttp.ClientSession() as session:
        url = f"{base_url}/slow/2"
        res = await check_url(session, url, 0.5)
        assert 0.5 <= res.elapsed < 1
        assert res.status is None
        assert res.error is not None


async def test_non_http_url_raises_value_error():
        with pytest.raises(ValueError):
            await check_url(None, "ftp://example.com", 3)