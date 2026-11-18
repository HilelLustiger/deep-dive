import math


class BigramModel:
    vocab_size: int
    k: float
    counts: dict[int, dict[int, int]]
    totals: dict[int, int]

    def __init__(self, vocab_size: int, k: float = 1.0):
        self.vocab_size = vocab_size
        self.k = k
        self.counts = {}
        self.totals = {}

    def train(self, ids: list[int]) -> None:
        for prev, nxt in zip(ids, ids[1:]):
            following = self.counts.setdefault(prev, {})
            following[nxt] = following.get(nxt, 0) + 1
            self.totals[prev] = self.totals.get(prev, 0) + 1

    def prob(self, prev: int, nxt: int) -> float:
        pair_count = self.counts.get(prev, {}).get(nxt, 0)
        prev_count = self.totals.get(prev, 0)
        return (pair_count + self.k) / (prev_count + self.k * self.vocab_size)

    def perplexity(self, ids: list[int]) -> float:
        log_probs = [math.log(self.prob(prev, nxt)) for prev, nxt in zip(ids, ids[1:])]
        return math.exp(-sum(log_probs) / len(log_probs))

    def next_logits(self, ids: list[int]) -> list[float]:
        following = self.counts.get(ids[-1])
        if not following:
            return [0.0] * self.vocab_size

        logits = [-math.inf] * self.vocab_size
        for nxt, count in following.items():
            logits[nxt] = math.log(count)
        return logits
