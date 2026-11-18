import random

from lm.generate import generate


def fake(ids):
    return [0.0, 0.0, 5.0]


def test_greedy_generation():
    assert generate(fake, [0], 4, random.Random(0), temperature=0) == [0, 2, 2, 2, 2]


def test_same_seed_same_output_and_input_unchanged():
    ids = [0]
    first = generate(fake, ids, 4, random.Random(0), temperature=1)
    second = generate(fake, ids, 4, random.Random(0), temperature=1)
    assert first == second
    assert ids == [0]
