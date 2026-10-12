import time
import threading


class Account:
    def __init__(self, account_id, balance, pause=0):
        self._balance = balance
        self._account_id = account_id
        self._pause = pause

    @property
    def account_id(self):
        return self._account_id

    @property
    def balance(self):
        return self._balance

    @property
    def pause(self):
        return self._pause

    def withdraw(self, amount: float):
        if amount <= 0:
            raise ValueError
        elif amount > self._balance:
            return False
        else:
            time.sleep(self.pause)
            self._balance -= amount
            return True

    def deposit(self, amount: float):
        if amount <= 0:
            raise ValueError

        temp = self._balance
        time.sleep(self.pause)
        self._balance = temp + amount
        return True


class SafeAccount(Account):
    def __init__(self, account_id, balance, pause=0):
        super().__init__(account_id, balance, pause)
        self._lock = threading.Lock()

    @property
    def lock(self):
        return self._lock

    def withdraw(self, amount: float):
        with self._lock:
            return super().withdraw(amount)

    def deposit(self, amount: float):
        with self._lock:
            return super().deposit(amount)

    def _debit(self, amount: float):
        self._balance -= amount

    def _credit(self, amount: float):
        self._balance += amount
