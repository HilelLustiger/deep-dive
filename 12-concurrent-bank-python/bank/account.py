import time

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