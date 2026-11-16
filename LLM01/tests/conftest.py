from pathlib import Path

import pytest

DATA = Path(__file__).parent.parent / "data" / "tinyshakespeare.txt"


@pytest.fixture(scope="session")
def text():
    return DATA.read_text(encoding="utf-8")
