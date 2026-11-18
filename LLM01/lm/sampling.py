import math
import random


def softmax(logits: list[float], temperature: float = 1.0) -> list[float]:
    if temperature <= 0:
        raise ValueError("temperature must be positive")

    scaled = [logit / temperature for logit in logits]
    top = max(scaled)
    exps = [math.exp(x - top) for x in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def _keep(probs: list[float], kept: list[int]) -> list[float]:
    total = sum(probs[i] for i in kept)
    result = [0.0] * len(probs)
    for i in kept:
        result[i] = probs[i] / total
    return result


def _by_prob(probs: list[float]) -> list[int]:
    return sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)


def top_k(probs: list[float], k: int) -> list[float]:
    return _keep(probs, _by_prob(probs)[:k])


def top_p(probs: list[float], p: float) -> list[float]:
    kept, total = [], 0.0
    for i in _by_prob(probs):
        kept.append(i)
        total += probs[i]
        if total >= p:
            break
    return _keep(probs, kept)


def sample(probs: list[float], rng: random.Random) -> int:
    r = rng.random()
    total = 0.0
    for i, prob in enumerate(probs):
        total += prob
        if total > r:
            return i
    return max(i for i, prob in enumerate(probs) if prob > 0)


def greedy(logits: list[float]) -> int:
    return max(range(len(logits)), key=lambda i: logits[i])


def choose_next(
    logits: list[float],
    rng: random.Random,
    temperature: float = 1.0,
    k: int | None = None,
    p: float | None = None,
) -> int:
    if temperature == 0:
        return greedy(logits)

    probs = softmax(logits, temperature)
    if k is not None:
        probs = top_k(probs, k)
    if p is not None:
        probs = top_p(probs, p)
    return sample(probs, rng)
