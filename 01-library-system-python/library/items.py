import abc
from .errors import ItemUnavailableError, InvalidReturnError


class LibraryItem(abc.ABC):
    def __init__(self, item_id, title, copies):
        self._item_id = item_id
        self._title = title
        self._total_copies = copies
        self._available_copies = copies

    @property
    def item_id(self):
        return self._item_id

    @property
    def title(self):
        return self._title 

    @property
    def total_copies(self):
        return self._total_copies
    
    @property
    def available_copies(self):
        return self._available_copies
    
    def checkout(self):
        if self._available_copies > 0:
            self._available_copies -= 1
        else:
            raise ItemUnavailableError(f"There are no available copies of '{self._title}'.")

    def return_copy(self):
        if self._available_copies < self._total_copies:
            self._available_copies += 1
        else:
            raise InvalidReturnError(f"All copies of '{self._title}' are already available.")

    @abc.abstractmethod
    def describe(self):
        pass


class Book(LibraryItem):
    def __init__(self, item_id, title, copies, author):
        super().__init__(item_id, title, copies)
        self._author = author

    @property
    def author(self):
        return self._author
    
    def describe(self):
        return f"{self.title} by {self.author} - {self.available_copies} / {self.total_copies} available"


class DVD(LibraryItem):
    def __init__(self, item_id, title, copies, minutes):
        super().__init__(item_id, title, copies)
        self._minutes = minutes

    @property
    def minutes(self):
        return self._minutes

    def describe(self):
        return f"{self.title} ({self.minutes} mins) - {self.available_copies} / {self.total_copies} available"