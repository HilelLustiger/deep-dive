import random
from collections.abc import Callable

from lm.sampling import choose_next


def generate(
    next_logits: Callable[[list[int]], list[float]],
    ids: list[int],
    n: int,
    rng: random.Random,
    temperature: float = 1.0,
    k: int | None = None,
    p: float | None = None,
) -> list[int]:
    ids = list(ids)
    for _ in range(n):
        ids.append(choose_next(next_logits(ids), rng, temperature, k, p))
    return ids
