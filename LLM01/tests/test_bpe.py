import pytest
from lm.bpe import BPETokenizer, get_pair_counts, merge


@pytest.fixture(scope="module")
def shakespeare_tokenizer(text):
    tokenizer = BPETokenizer()
    tokenizer.train(text[:20_000], vocab_size=300)
    return tokenizer


def test_get_pair_counts():
    assert get_pair_counts([1, 2, 3, 1, 2]) == {(1, 2): 2, (2, 3): 1, (3, 1): 1}


def test_get_pair_counts_adds_to_given_counts():
    counts = {(1, 2): 5, (7, 8): 1}
    result = get_pair_counts([1, 2, 3], counts)
    assert result is counts
    assert counts == {(1, 2): 6, (7, 8): 1, (2, 3): 1}


def test_merge_replaces_every_occurrence():
    assert merge([1, 2, 3, 1, 2], (1, 2), 99) == [99, 3, 99]


def test_merge_skips_past_a_match():
    assert merge([97, 97, 97], (97, 97), 256) == [256, 97]


def test_new_tokenizer_has_only_bytes():
    tokenizer = BPETokenizer()
    assert tokenizer.merges == {}
    assert tokenizer.vocab == {i: bytes([i]) for i in range(256)}


def test_train_on_wikipedia_example():
    tokenizer = BPETokenizer()
    tokenizer.train("aaabdaaabac", vocab_size=259)
    assert tokenizer.merges == {(97, 97): 256, (256, 97): 257, (257, 98): 258}
    assert tokenizer.vocab[258] == b"aaab"
    assert tokenizer.encode("aaabdaaabac") == [258, 100, 258, 97, 99]


@pytest.mark.parametrize("sample", ["שלום עולם 👋", "To be, or not to be"])
def test_round_trip(shakespeare_tokenizer, sample):
    assert shakespeare_tokenizer.decode(shakespeare_tokenizer.encode(sample)) == sample


def test_encoding_is_shorter_than_bytes(shakespeare_tokenizer, text):
    sample = text[50_000:55_000]
    assert len(shakespeare_tokenizer.encode(sample)) < len(sample.encode("utf-8"))


def test_decode_broken_byte_does_not_raise():
    assert BPETokenizer().decode([215]) == "�"
