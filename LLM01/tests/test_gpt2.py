import random

import pytest
import torch
from lm.bigram import BigramModel
from lm.generate import generate
from lm.gpt2 import CONTEXT, GPT2


@pytest.fixture(scope="module")
def gpt2():
    return GPT2()


def test_next_logits_covers_the_vocabulary(gpt2):
    assert len(gpt2.next_logits(gpt2.encode("Hello world"))) == 50257


def test_our_greedy_matches_the_library(gpt2):
    ids = gpt2.encode("ROMEO:\n")
    ours = generate(gpt2.next_logits, ids, 20, random.Random(0), temperature=0)
    theirs = gpt2.model.generate(
        torch.tensor([ids]), max_new_tokens=20, do_sample=False, pad_token_id=50256
    )[0].tolist()
    assert ours == theirs


def test_long_input_keeps_the_last_context(gpt2):
    short = gpt2.encode("To be, or not to be, that is the question. ")
    ids = (short * (1500 // len(short) + 1))[:1500]
    assert gpt2.next_logits(ids) == pytest.approx(gpt2.next_logits(ids[-CONTEXT:]), abs=1e-4)


def test_gpt2_beats_counting(gpt2, train_ids, test_ids):
    bigram = BigramModel(vocab_size=50257, k=0.01)
    bigram.train(train_ids)
    gpt2_perplexity = gpt2.perplexity(test_ids)
    assert gpt2_perplexity < 100
    assert gpt2_perplexity < bigram.perplexity(test_ids) / 3
