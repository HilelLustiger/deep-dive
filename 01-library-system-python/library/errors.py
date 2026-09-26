class ItemUnavailableError(Exception):
    """Raised when there are no available copies of the item"""
    pass


class InvalidReturnError(Exception):
    """Raised when the return is not allowed"""
    pass


class NotFoundError(Exception):
    """Raised when there is no item or member exists with the given ID"""
    pass
