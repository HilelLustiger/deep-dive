"""Tests for Part 7: threads vs. processes."""

import os
import time

import pytest

from bank.workloads import (
    CPU_N,
    cpu_task,
    io_task,
    run_processes,
    run_serial,
    run_threads,
)


def test_threads_speed_up_io_bound_work():
    items = [0.2] * 8
    
    start_serial = time.perf_counter()
    run_serial(func=io_task, items=items)
    end_serial = time.perf_counter()

    start_threads = time.perf_counter()
    run_threads(func=io_task, items=items, workers=8)
    end_threads = time.perf_counter()

    assert (end_serial - start_serial) / 2 > end_threads - start_threads


def test_threads_do_not_speed_up_cpu_bound_work():
    items = [CPU_N] * 4

    start_serial = time.perf_counter()
    run_serial(func=cpu_task, items=items)
    end_serial = time.perf_counter()

    start_threads = time.perf_counter()
    run_threads(func=cpu_task, items=items, workers=4)
    end_threads = time.perf_counter()

    assert end_threads - start_threads >= 0.8 * (end_serial - start_serial)


@pytest.mark.skipif(os.cpu_count() < 2, reason="needs at least 2 CPU cores")
def test_processes_speed_up_cpu_bound_work():
    items = [CPU_N] * 4
    
    start_serial = time.perf_counter()
    run_serial(func=cpu_task, items=items)
    end_serial = time.perf_counter()

    start_processes = time.perf_counter()
    run_processes(func=cpu_task, items=items, workers=4)
    end_processes = time.perf_counter()

    assert end_processes - start_processes <= 0.75 * (end_serial - start_serial)


def test_all_runners_return_same_results_in_order():
    items = [i/50 for i in range(5)]

    res_serial = run_serial(func=io_task, items=items)
    res_threads = run_threads(func=io_task, items=items, workers=4)
    res_processes = run_processes(func=io_task, items=items, workers=4)

    assert res_serial == res_processes
    assert res_processes == res_threads
