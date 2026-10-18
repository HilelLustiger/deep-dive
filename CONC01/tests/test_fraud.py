import time
from bank.fraud import FraudChecker
from bank.runner import run_concurrently


def test_semaphore_limits_concurrent_checks_to_three():
    checker = FraudChecker(max_concurrent=3, delay=0.1)
    start = time.perf_counter()
    run_concurrently(10, checker.check, None)
    end = time.perf_counter()
    
    assert checker.peak == 3
    assert 0.35 <= end - start < 0.6


def test_ten_slots_run_all_checks_at_once():
    checker = FraudChecker(max_concurrent=10, delay=0.1)
    start = time.perf_counter()
    run_concurrently(10, checker.check, None)
    end = time.perf_counter()
    
    assert end - start < 0.2
