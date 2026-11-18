def get_pair_counts(ids: list[int], counts=None) -> dict[tuple[int, int], int]:
    if counts is None:
        counts = {}

    for pair in zip(ids, ids[1:]):
        counts[pair] = counts.get(pair, 0) + 1

    return counts


def merge(ids: list[int], pair: tuple[int, int], new_id: int) -> list[int]:
    idx, output = 0, []
    while idx < len(ids):
        if idx < len(ids) - 1 and pair == (ids[idx], ids[idx + 1]):
            output.append(new_id)
            idx += 2

        else:
            output.append(ids[idx])
            idx += 1

    return output


class BPETokenizer:
    merges: dict[tuple[int, int], int]
    vocab: dict[int, bytes]

    def __init__(self):
        self.merges = {}
        self.vocab = {i: bytes([i]) for i in range(256)}

    def _chunks(self, text: str) -> list[str]:
        return [text]
    
    def train(self, text: str, vocab_size: int) -> None:
        chunks = [list(chunk.encode("utf-8")) for chunk in self._chunks(text)]

        for i in range(vocab_size - 256):
            counts, new_id = {}, 256 + i

            for chunk in chunks:
                counts = get_pair_counts(ids=chunk, counts=counts)

            if len(counts) == 0:
                break

            pair = max(counts, key=counts.get)
            self.vocab[new_id] = self.vocab[pair[0]] + self.vocab[pair[1]]
            self.merges[pair] = new_id

            chunks = [merge(ids=chunk, pair=pair, new_id=new_id) for chunk in chunks]

    def encode(self, text: str) -> list[int]:
        chunks = [list(chunk.encode("utf-8")) for chunk in self._chunks(text)]

        ids = []
        for chunk in chunks:
            while len(chunk) >= 2:
                counts = get_pair_counts(chunk)
                pair = min(counts, key=lambda p: self.merges.get(p, float("inf")))

                if pair not in self.merges:
                    break

                chunk = merge(chunk, pair, self.merges[pair])

            ids.extend(chunk)

        return ids

    def decode(self, ids: list[int]) -> str:
        data = b"".join(self.vocab[i] for i in ids)
        return data.decode("utf-8", errors="replace")