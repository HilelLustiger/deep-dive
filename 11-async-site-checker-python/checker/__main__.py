import argparse
import asyncio
import time
from .models import CheckResult
from .runner import check_as_completed_limited


def is_timeout(res: CheckResult) -> bool:
    return res.error is not None and res.error.startswith("Timeout")


def format_result(res: CheckResult) -> str:
    mark = "✓" if res.ok else "✗"
    status = str(res.status) if res.status is not None else "---"
    line = f"{mark} {status}  {res.elapsed:.2f}s  {res.url}"
    if is_timeout(res):
        line += "  (timeout)"
    elif res.error is not None:
        line += f"  ({res.error})"
    return line


async def run(urls: list[str], timeout: float, max_concurrent: int):
    up = down = timed_out = 0
    start = time.perf_counter()

    async for res in check_as_completed_limited(urls, timeout, max_concurrent):
        print(format_result(res))
        if res.ok:
            up += 1
        elif is_timeout(res):
            timed_out += 1
        else:
            down += 1

    total = time.perf_counter() - start
    print(f"\n{up} up, {down} down, {timed_out} timed out in {total:.2f}s")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=str)
    parser.add_argument("--timeout", type=float, default=5)
    parser.add_argument("--max-concurrent", type=int, default=10)
    args = parser.parse_args()

    # opening and extracting urls from file
    with open(args.path) as f:
        urls = [line.strip() for line in f if line.strip()]

    asyncio.run(run(urls, args.timeout, args.max_concurrent))


if __name__ == "__main__":
    main()
