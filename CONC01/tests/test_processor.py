from bank.account import SafeAccount
from bank.processor import TransactionProcessor
import random
import time

def test_random_transactions_keep_total():
    bank = {i: SafeAccount(i, 200) for i in range(5)}
    processor = TransactionProcessor(bank, workers=4, queue_size=10)

    processor.start()

    for _ in range(1000):
        src = random.randint(0, 4)
        dst = random.randint(0, 4)
        amount = random.randint(0, 200)

        processor.submit(src, dst, amount)

    processor.shutdown()

    total_balance = 0
    for account in bank.values():
        total_balance += account.balance

    assert total_balance == 1000


def test_overdrawn_transactions_are_counted_as_failed_and_change_nothing():
    bank = {i: SafeAccount(i, 50) for i in range(3)}
    processor = TransactionProcessor(bank, workers=2, queue_size=10)

    processor.start()

    for _ in range(10):
        src = random.randint(0, 2)
        dst = random.randint(0, 2)
        amount = random.randint(51, 100)

        processor.submit(src, dst, amount)

    processor.shutdown()

    assert processor.failed == 10
    assert [account.balance for account in bank.values()] == [50, 50, 50]


def test_shutdown_stops_all_threads():
    bank = {i: SafeAccount(i, 50) for i in range(3)}
    processor = TransactionProcessor(bank, workers=2, queue_size=10)

    processor.start()

    for _ in range(10):
        src = random.randint(0, 2)
        dst = random.randint(0, 2)
        amount = random.randint(51, 100)

        processor.submit(src, dst, amount)

    processor.shutdown()
    assert len(processor.threads) == 2
    assert all(not thread.is_alive() for thread in processor.threads)


def test_submit_blocks_when_queue_is_full():
    bank = {i: SafeAccount(i, 50) for i in range(3)}
    processor = TransactionProcessor(bank=bank, workers=1, queue_size=2, pause=0.2)

    processor.start()
    start = time.perf_counter()
    
    for _ in range(10):
        processor.submit(0,1,0)

    end = time.perf_counter()
    processor.shutdown()

    assert 1 < end - start
