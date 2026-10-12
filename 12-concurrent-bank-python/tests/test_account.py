from bank.runner import run_concurrently
from bank.account import Account, SafeAccount


def test_withdraw_subtracts_amount_and_returns_true():
    account = Account(1, 100)
    res = account.withdraw(50)
    assert account.balance == 50
    assert res


def test_withdraw_returns_false_when_balance_too_low():
    account = Account(1, 0)
    res = account.withdraw(2)
    assert not res


def test_deposit_adds_amount():
    account = Account(1, 0)
    res = account.deposit(1)
    assert res
    assert account.balance == 1


def test_concurrent_withdraw_leaves_negative_balance():
    account = Account(1, 100, 0.001)
    run_concurrently(50, account.withdraw, 10)
    assert account.balance < 0


def test_concurrent_deposit_loses_deposits():
    account = Account(1, 0, 0.001)
    run_concurrently(20, account.deposit, 10)
    assert account.balance < 200


def test_safe_account_concurrent_withdraw_never_overdraws():
    account = SafeAccount(1, 100, 0.001)
    res = run_concurrently(50, account.withdraw, 10)
    assert res.count(True) == 10
    assert account.balance == 0


def test_safe_account_concurrent_deposit_keeps_every_deposit():
    account = SafeAccount(1, 0, 0.001)
    run_concurrently(20, account.deposit, 10)
    assert account.balance == 200