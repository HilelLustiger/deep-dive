import pytest
from transformers import AutoTokenizer


@pytest.fixture(scope="module")
def tok():
    return AutoTokenizer.from_pretrained("gpt2")


def test_strawberry(tok):
    assert len(tok.encode("strawberry")) == 3
    assert len(tok.encode(" strawberry")) == 1


def test_hebrew_has_more_tokens_than_characters(tok):
    sample = "שלום עולם"
    assert len(tok.encode(sample)) > len(sample)


def test_hello_world(tok):
    assert tok.encode("Hello world") == [15496, 995]
