from .items import LibraryItem
from .member import Member
from .errors import InvalidReturnError, NotFoundError


class Library:
    def __init__(self):
        self._items = {}
        self._members = {}

    def add_item(self, item: LibraryItem) -> None:
        self._items[item.item_id] = item

    def add_member(self, member: Member) -> None:
        self._members[member.member_id] = member

    def checkout(self, member_id, item_id) -> None:
        item = self._items.get(item_id)
        member = self._members.get(member_id)
        if not item:
            raise NotFoundError("Item not found")
        if not member:
            raise NotFoundError("Member not found")
        if item in member.borrowed_items:
            raise InvalidReturnError("This item is already borrowed by the member.")
        item.checkout()
        member.borrow_item(item)

    def return_item(self, member_id, item_id) -> None:
        item = self._items.get(item_id)
        member = self._members.get(member_id)
        if not item:
            raise NotFoundError("Item not found")
        if not member:
            raise NotFoundError("Member not found")
        if item not in member.borrowed_items:
            raise InvalidReturnError("This item was not borrowed by the member.")
        item.return_copy()
        member.return_item(item)

    def print_catalog(self) -> None:
        for item in self._items.values():
            print(item.describe())