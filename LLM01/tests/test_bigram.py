import math

import pytest
from lm.bigram import BigramModel


@pytest.fixture
def tiny():
    model = BigramModel(vocab_size=3, k=1)
    model.train([0, 1, 0, 1, 0, 2])
    return model


def test_smoothed_prob(tiny):
    assert tiny.prob(0, 1) == pytest.approx(0.5)


def test_probs_sum_to_one(tiny):
    assert tiny.prob(0, 0) + tiny.prob(0, 1) + tiny.prob(0, 2) == pytest.approx(1)


def test_unseen_prev_is_uniform(tiny):
    assert tiny.prob(2, 0) == pytest.approx(1 / 3)


def test_untrained_perplexity_is_vocab_size():
    assert BigramModel(vocab_size=50).perplexity([3, 17, 42, 3, 0]) == pytest.approx(50)


def test_next_logits(tiny):
    assert tiny.next_logits([0]) == [-math.inf, pytest.approx(math.log(2)), pytest.approx(0.0)]


def test_next_logits_of_unseen_prev_are_zeros(tiny):
    assert tiny.next_logits([2]) == [0.0, 0.0, 0.0]


def test_less_smoothing_lowers_perplexity(train_ids, test_ids):
    perplexities = {}
    for k in (1, 0.01):
        model = BigramModel(vocab_size=50257, k=k)
        model.train(train_ids)
        perplexities[k] = model.perplexity(test_ids)
    assert perplexities[0.01] < perplexities[1]
