import random
import threading

from bank.account import SafeAccount
from bank.runner import run_concurrently
from bank.transfer import transfer, transfer_naive


def test_transfer_naive_deadlocks_on_opposite_transfers():

    account_a = SafeAccount(1, 0, 0)
    account_b = SafeAccount(2, 0, 0)
    exceptions = []

    def helper(src, dst):
        try:
            transfer_naive(src, dst, 50, 0.05, 0.5)
        except Exception as e:
            exceptions.append(e)


    t1 = threading.Thread(target=helper, args=(account_a, account_b))
    t2 = threading.Thread(target=helper, args=(account_b, account_a))

    t1.start()
    t2.start()

    t1.join()
    t2.join()

    assert any(isinstance(e, TimeoutError) for e in exceptions)


def test_transfer_completes_opposite_transfers_and_keeps_total():
    account_a = SafeAccount(1, 100, 0)
    account_b = SafeAccount(2, 100, 0)
    exceptions = []

    def helper(src, dst, amount):
        try:
            transfer(src, dst, amount, 0.05)
        except Exception as e:
            exceptions.append(e)


    t1 = threading.Thread(target=helper, args=(account_a, account_b, 20))
    t2 = threading.Thread(target=helper, args=(account_b, account_a, 50))

    t1.start()
    t2.start()

    t1.join()
    t2.join()

    assert not exceptions
    assert account_a.balance == 130
    assert account_b.balance == 70



def test_many_random_transfers_keep_total_money():
    accounts = []
    for i in range(5):
        account = SafeAccount(i, 1000, 0)
        accounts.append(account)

    def helper():
        src, dst = random.sample(accounts, 2)
        amount = random.randint(1, 200)
        try:
            transfer(src, dst, amount)
        except ValueError:
            pass

    res = run_concurrently(100, helper)
    
    total = 0
    for acc in accounts:
        total += acc.balance

    assert not any(isinstance(e, Exception) for e in res)
    assert total == 5000