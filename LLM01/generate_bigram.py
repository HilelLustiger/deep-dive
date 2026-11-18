import random
from pathlib import Path

from transformers import AutoTokenizer

from lm.bigram import BigramModel
from lm.generate import generate

path = Path(__file__).parent / "data" / "tinyshakespeare.txt"
text = path.read_text(encoding="utf-8")

tokenizer = AutoTokenizer.from_pretrained("gpt2")
model = BigramModel(vocab_size=len(tokenizer), k=0.01)
model.train(tokenizer.encode(text[:1_000_000]))

prompt = tokenizer.encode("ROMEO:\n")

for temperature in (1, 0):
    ids = generate(model.next_logits, prompt, 40, random.Random(0), temperature=temperature)
    print(f"--- temperature {temperature} ---")
    print(repr(tokenizer.decode(ids)))
    print()
