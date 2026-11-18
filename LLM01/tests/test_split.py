import pytest
import regex
from lm.bpe import BPETokenizer
from lm.split import GPT2_SPLIT_PATTERN, SplitBPETokenizer


def train(tokenizer, text):
    tokenizer.train(text[:20_000], vocab_size=300)
    return tokenizer


@pytest.fixture(scope="module")
def split_tokenizer(text):
    return train(SplitBPETokenizer(), text)


def has_inner_space(token):
    return b" " in token[1:]


def test_split_pattern():
    assert regex.findall(GPT2_SPLIT_PATTERN, "Hello world's 123!  ok") == [
        "Hello", " world", "'s", " 123", "!", " ", " ok",
    ]


def test_split_tokens_have_spaces_only_at_start(split_tokenizer):
    assert not any(has_inner_space(token) for token in split_tokenizer.vocab.values())


def test_unsplit_tokens_have_inner_spaces(text):
    tokenizer = train(BPETokenizer(), text)
    assert any(has_inner_space(token) for token in tokenizer.vocab.values())


def test_round_trip(split_tokenizer):
    sample = "שלום עולם 👋"
    assert split_tokenizer.decode(split_tokenizer.encode(sample)) == sample
