import pytest
from library.items import LibraryItem, Book, DVD
from library.errors import ItemUnavailableError, InvalidReturnError


def test_creating_library_item_raises():
    with pytest.raises(TypeError):
        item = LibraryItem("001", "Generic Item", 5)


def test_new_book_has_all_available_copies():
    book = Book("001", "The Great Gatsby", 3, "F. Scott Fitzgerald")
    assert book.available_copies == 3


def test_checkout_book_reduces_available_copies():
    book = Book("001", "The Great Gatsby", 3, "F. Scott Fitzgerald")
    book.checkout()
    assert book.available_copies == 2


def test_checkout_dvd_reduces_available_copies():
    dvd = DVD("002", "Inception", 2, 148)
    dvd.checkout()
    assert dvd.available_copies == 1


def test_checkout_book_raises_when_no_copies():
    book = Book("001", "The Great Gatsby", 0, "F. Scott Fitzgerald")
    with pytest.raises(ItemUnavailableError):
        book.checkout()


def test_checkout_dvd_raises_when_no_copies():
    dvd = DVD("002", "Inception", 0, 148)
    with pytest.raises(ItemUnavailableError):
        dvd.checkout()


def test_return_copy_increases_available_copies():
    book = Book("001", "The Great Gatsby", 3, "F. Scott Fitzgerald")
    book.checkout()
    book.return_copy()
    assert book.available_copies == 3


def test_return_copy_raises_when_all_copies_available():
    book = Book("001", "The Great Gatsby", 3, "F. Scott Fitzgerald")
    with pytest.raises(InvalidReturnError):
        book.return_copy()


def test_assigning_copies_from_outside_raises():
    book = Book("001", "The Great Gatsby", 3, "F. Scott Fitzgerald")
    with pytest.raises(AttributeError):
        book.available_copies = 5


def test_describe_book():
    book = Book("001", "The Great Gatsby", 3, "F. Scott Fitzgerald")
    description = book.describe()
    assert description == "The Great Gatsby by F. Scott Fitzgerald - 3 / 3 available"


def test_describe_dvd():
    dvd = DVD("002", "Inception", 2, 148)
    description = dvd.describe()
    assert description == "Inception (148 mins) - 2 / 2 available"
