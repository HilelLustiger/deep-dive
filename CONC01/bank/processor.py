import threading
import queue
from bank.transfer import transfer

class TransactionProcessor():

    def __init__(self, bank, workers: int, queue_size: int, pause=0):
        self._bank = bank
        self._workers = workers
        self._pause = pause
        self.queue = queue.Queue(queue_size)
        self.threads = []
        self._failed = 0
        self._fail_lock = threading.Lock()

    @property
    def bank(self):
        return self._bank

    @property
    def workers(self):
        return self._workers

    @property
    def pause(self):
        return self._pause
    
    @property
    def failed(self):
        return self._failed

    def submit(self, src_id, dst_id, amount):
        self.queue.put((src_id, dst_id, amount))

    def _work(self):
        while True:
            task = self.queue.get()
            try:
                if task is None:
                    break

                src_id, dst_id, amount = task
                src, dst = self._bank[src_id], self._bank[dst_id]
                
                try:
                    transfer(src, dst, amount, self._pause)
                except ValueError:
                    with self._fail_lock:
                        self._failed += 1
            finally:
                self.queue.task_done()

    def start(self):
        for _ in range(self.workers):
            t = threading.Thread(target=self._work)
            t.start()
            self.threads.append(t)            
            
    def shutdown(self):
        self.queue.join()

        for _ in self.threads:
            self.queue.put(None)

        for t in self.threads:
            t.join()