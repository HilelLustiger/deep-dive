import math
import random

import pytest
from lm.sampling import choose_next, greedy, sample, softmax, top_k, top_p


def test_softmax_sums_to_one_and_increases():
    probs = softmax([1, 2, 3])
    assert sum(probs) == pytest.approx(1)
    assert probs[0] < probs[1] < probs[2]


def test_softmax_ignores_a_shift():
    assert softmax([1, 2, 3]) == pytest.approx(softmax([101, 102, 103]))


def test_softmax_does_not_overflow():
    assert softmax([1000, 1000]) == pytest.approx([0.5, 0.5])


def test_softmax_of_minus_infinity_is_zero():
    assert softmax([0, -math.inf]) == pytest.approx([1, 0])


def test_low_temperature_picks_the_top():
    assert softmax([1, 2, 3], temperature=0.01)[2] > 0.999


def test_high_temperature_is_almost_uniform():
    for prob in softmax([1, 2, 3], temperature=100):
        assert prob == pytest.approx(1 / 3, abs=0.01)


def test_zero_temperature_raises():
    with pytest.raises(ValueError):
        softmax([1, 2, 3], temperature=0)


def test_top_k():
    assert top_k([0.5, 0.3, 0.2], 2) == pytest.approx([0.625, 0.375, 0.0])


def test_top_p_keeps_enough_to_reach_p():
    assert top_p([0.5, 0.3, 0.2], 0.7) == pytest.approx([0.625, 0.375, 0.0])


def test_top_p_can_keep_one():
    assert top_p([0.5, 0.3, 0.2], 0.5) == pytest.approx([1.0, 0.0, 0.0])


def test_sample_follows_the_probabilities():
    probs = [0.5, 0.3, 0.2]
    rng = random.Random(0)
    picks = [sample(probs, rng) for _ in range(10_000)]
    for i, prob in enumerate(probs):
        assert picks.count(i) / len(picks) == pytest.approx(prob, abs=0.02)


def test_sample_with_one_possible_token():
    rng = random.Random(0)
    assert all(sample([0.0, 1.0, 0.0], rng) == 1 for _ in range(100))


def test_greedy():
    assert greedy([1, 5, 3]) == 1


def test_choose_next_at_zero_temperature_is_greedy():
    logits = [0.2, 1.7, -3.0, 1.1]
    assert choose_next(logits, random.Random(0), temperature=0) == greedy(logits)
