import math

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

CONTEXT = 1024


class GPT2:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("gpt2")
        self.model = AutoModelForCausalLM.from_pretrained("gpt2")
        self.model.eval()

    def encode(self, text: str) -> list[int]:
        return self.tokenizer.encode(text)

    def decode(self, ids: list[int]) -> str:
        return self.tokenizer.decode(ids)

    def _logits(self, ids: list[int]) -> torch.Tensor:
        with torch.no_grad():
            return self.model(torch.tensor([ids])).logits[0]

    def next_logits(self, ids: list[int]) -> list[float]:
        return self._logits(ids[-CONTEXT:])[-1].tolist()

    def perplexity(self, ids: list[int]) -> float:
        ids = ids[:CONTEXT]
        logp = torch.log_softmax(self._logits(ids)[:-1], dim=-1)
        targets = torch.tensor(ids[1:])
        picked = logp[torch.arange(len(targets)), targets]
        return math.exp(-picked.mean().item())
