import threading
import time


class FraudChecker():

    def __init__(self, max_concurrent: int, delay: float):
        self._delay = delay
        self._semaphore = threading.Semaphore(max_concurrent)
        self._peak = 0
        self._peak_lock = threading.Lock()
        self._running_checks = 0
        self._running_checks_lock = threading.Lock()

    @property
    def delay(self):
        return self._delay
        
    @property
    def peak(self):
        return self._peak

    @property
    def running_checks(self):
        return self._running_checks
    
    def check(self, transaction) -> bool:
        with self._semaphore:
            with self._running_checks_lock:
                self._running_checks += 1
            
                if self.running_checks > self.peak:
                    with self._peak_lock:
                        self._peak = self.running_checks

            time.sleep(self._delay)
            with self._running_checks_lock:
                self._running_checks -= 1

        return True
