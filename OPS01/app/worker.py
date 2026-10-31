import signal
import threading

from app.db import count_items, init_db


def main():
    init_db()
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda signum, frame: stop.set())

    while not stop.is_set():
        count = count_items()
        print(f"items: {count}", flush=True)
        stop.wait(5)


if __name__ == "__main__":
    main()
