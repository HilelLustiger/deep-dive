import threading


def run_concurrently(n, func, *args):
    results = [None] * n
    barrier = threading.Barrier(n)

    def worker(index) -> None:
        barrier.wait()

        try:
            results[index] = func(*args)
        except Exception as e:
            results[index] = e

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]

    for t in threads:
        t.start()

    for t in threads:
        t.join()

    return results