import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor


CPU_N = 12_000_000


def io_task(seconds: float) -> float:
    time.sleep(seconds)
    return seconds


def cpu_task(n: int):
    res = 0
    for i in range(n):
        res += i * i

    return res


def run_serial(func, items):
    return [func(item) for item in items]


def run_threads(func, items, workers):
    with ThreadPoolExecutor(max_workers=workers) as executor:
        return list(executor.map(func, items))


def run_processes(func, items, workers):
    with ProcessPoolExecutor(max_workers=workers) as executor:
        return list(executor.map(func, items))
