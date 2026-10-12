import asyncio
import time
import aiohttp
from .models import CheckResult


async def check_url(
    session: aiohttp.ClientSession, url: str, timeout: float
) -> CheckResult:
    if not url.startswith(("http://", "https://")):
        raise ValueError(f"Invalid URL: {url}. Must start with http:// or https://")

    start_time = time.perf_counter()
    res = CheckResult(
        url=url,
        status=None,
        elapsed=0,
        error=None,
    )
    try:
        async with asyncio.timeout(timeout):
            async with session.get(url) as response:
                res.status = response.status

    except asyncio.TimeoutError:
        res.error = f"Timeout after {timeout} seconds"
    except aiohttp.ClientError as e:
        res.error = str(e)

    res.elapsed = time.perf_counter() - start_time
    return res
