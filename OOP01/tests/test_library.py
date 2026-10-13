import pytest
from library.library import Library
from library.items import Book, DVD
from library.member import Member
from library.errors import ItemUnavailableError, InvalidReturnError, NotFoundError


@pytest.fixture
def lib():
    library = Library()
    library.add_item(Book(1, "Dune", 3, "Frank Herbert"))
    library.add_item(DVD(2, "Alien", 1, 117))
    library.add_member(Member(10, "Dana"))
    library.add_member(Member(11, "Noa"))
    return library


def get_member(library, member_id):
    return library._members[member_id]


def get_item(library, item_id):
    return library._items[item_id]


def test_new_member_has_no_borrowed_items():
    member = Member(10, "Dana")
    assert member.borrowed_items == ()


def test_checkout_adds_item_to_member_and_takes_a_copy(lib):
    lib.checkout(10, 1)
    item = get_item(lib, 1)
    assert item in get_member(lib, 10).borrowed_items
    assert item.available_copies == 2


def test_return_item_undoes_checkout(lib):
    lib.checkout(10, 1)
    lib.return_item(10, 1)
    assert get_member(lib, 10).borrowed_items == ()
    assert get_item(lib, 1).available_copies == 3


def test_checkout_unknown_member_raises(lib):
    with pytest.raises(NotFoundError):
        lib.checkout(99, 1)


def test_checkout_unknown_item_raises(lib):
    with pytest.raises(NotFoundError):
        lib.checkout(10, 99)


def test_return_unknown_member_raises(lib):
    with pytest.raises(NotFoundError):
        lib.return_item(99, 1)


def test_return_unknown_item_raises(lib):
    with pytest.raises(NotFoundError):
        lib.return_item(10, 99)


def test_checkout_with_no_copies_left_raises_and_changes_nothing(lib):
    lib.checkout(10, 2)
    with pytest.raises(ItemUnavailableError):
        lib.checkout(11, 2)
    assert get_member(lib, 11).borrowed_items == ()
    assert get_item(lib, 2).available_copies == 0


def test_return_item_not_borrowed_raises(lib):
    with pytest.raises(InvalidReturnError):
        lib.return_item(10, 1)
    assert get_item(lib, 1).available_copies == 3


def test_return_item_borrowed_by_another_member_raises(lib):
    lib.checkout(10, 1)
    with pytest.raises(InvalidReturnError):
        lib.return_item(11, 1)
    assert get_item(lib, 1).available_copies == 2
    assert get_item(lib, 1) in get_member(lib, 10).borrowed_items


def test_checkout_same_item_twice_raises_and_takes_one_copy(lib):
    lib.checkout(10, 1)
    with pytest.raises(InvalidReturnError):
        lib.checkout(10, 1)
    assert get_item(lib, 1).available_copies == 2
    assert len(get_member(lib, 10).borrowed_items) == 1


def test_print_catalog_prints_one_line_per_item(lib, capsys):
    lib.print_catalog()
    lines = capsys.readouterr().out.splitlines()
    assert lines == [
        "Dune by Frank Herbert - 3 / 3 available",
        "Alien (117 mins) - 1 / 1 available",
    ]
