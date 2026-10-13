import time


def transfer_naive(src, dst, amount, pause=0, lock_timeout=1):

    src.lock.acquire()
    try:
        time.sleep(pause)
        if not dst.lock.acquire(timeout=lock_timeout):
            raise TimeoutError
        try:
            src._debit(amount)
            dst._credit(amount)
        finally:
            dst.lock.release()
    finally:
        src.lock.release()


def transfer(src, dst, amount, pause=0):
    if src.account_id == dst.account_id:
        raise ValueError

    first, second = (src, dst) if src.account_id < dst.account_id else (dst, src)
    with first.lock:
        time.sleep(pause)
        with second.lock:
            if src.balance < amount:
                raise ValueError

            src._debit(amount)
            dst._credit(amount)
