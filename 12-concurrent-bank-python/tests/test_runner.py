from bank.runner import run_concurrently 
import time


def test_run_concurrently_calls_func_n_times():

    marks = []

    def func() -> None:
        marks.append('#')

    res = run_concurrently(5, func)
    
    assert len(marks) == 5
    assert len(res) == 5

   
def test_run_concurrently_passes_args_to_func():

    def add(arg1: int, arg2: int) -> int:
        return arg1 + arg2
    
    res = run_concurrently(3, add, 2, 3)
    assert res == [5, 5, 5]


def test_run_concurrently_returns_exceptions_from_func():

    def func() -> ValueError:
        return float('Hello')

    res = run_concurrently(3, func)
    
    assert [isinstance(res[i], ValueError) for i in range(3)] == [True, True, True]


def test_run_concurrently_runs_threads_at_the_same_time():

    def func() -> int:
        time.sleep(0.2)
        return 1

    start = time.perf_counter()
    run_concurrently(5, func)
    end = time.perf_counter()

    assert 0.2 <= end - start < 0.5