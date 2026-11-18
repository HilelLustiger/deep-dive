from pathlib import Path

import pytest
from transformers import AutoTokenizer

DATA = Path(__file__).parent.parent / "data" / "tinyshakespeare.txt"


@pytest.fixture(scope="session")
def text():
    return DATA.read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def gpt2_tokenizer():
    return AutoTokenizer.from_pretrained("gpt2")


@pytest.fixture(scope="session")
def train_ids(text, gpt2_tokenizer):
    return gpt2_tokenizer.encode(text[:1_000_000])


@pytest.fixture(scope="session")
def test_ids(text, gpt2_tokenizer):
    return gpt2_tokenizer.encode(text[1_000_000:])[:1024]
