from .items import LibraryItem
from .errors import NotFoundError


class Member:
    def __init__(self, member_id, name):
        self._member_id = member_id
        self._name = name
        self._borrowed_items = {}

    @property
    def member_id(self):
        return self._member_id

    @property
    def name(self):
        return self._name

    @property
    def borrowed_items(self):
        return tuple(self._borrowed_items.values())

    def borrow_item(self, item: LibraryItem) -> None:
        if item.item_id not in self._borrowed_items:
            self._borrowed_items[item.item_id] = item

    def return_item(self, item: LibraryItem) -> None:
        if item.item_id in self._borrowed_items:
            self._borrowed_items.pop(item.item_id, None)
        else:
            raise NotFoundError("This item was not borrowed by the member.")