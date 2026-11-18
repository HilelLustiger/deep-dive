import random
from pathlib import Path

from lm.bigram import BigramModel
from lm.generate import generate
from lm.gpt2 import CONTEXT, GPT2

path = Path(__file__).parent / "data" / "tinyshakespeare.txt"
text = path.read_text(encoding="utf-8")

gpt2 = GPT2()

ids = generate(gpt2.next_logits, gpt2.encode("ROMEO:\n"), 40, random.Random(0), temperature=0.8, k=50)
print(gpt2.decode(ids))
print()

bigram = BigramModel(vocab_size=len(gpt2.tokenizer), k=0.01)
bigram.train(gpt2.encode(text[:1_000_000]))
test_ids = gpt2.encode(text[1_000_000:])[:CONTEXT]

print(f"bigram perplexity: {bigram.perplexity(test_ids):.1f}")
print(f"gpt2 perplexity:   {gpt2.perplexity(test_ids):.1f}")
