from pathlib import Path

from transformers import AutoTokenizer

from lm.split import SplitBPETokenizer

path = Path(__file__).parent / "data" / "tinyshakespeare.txt"
text = path.read_text(encoding="utf-8")

gpt2 = AutoTokenizer.from_pretrained("gpt2")
my_tokenizer = SplitBPETokenizer()

my_tokenizer.train(text=text[:100_000], vocab_size=512)

SAMPLES = [
    "strawberry",
    " strawberry",
    "How many r's are in strawberry?",
    "12345 + 67890 = 80235",
    "שלום, מה שלומך?",
    "def add(a, b):\n    return a + b",
]

for sample in SAMPLES:
    mine = [my_tokenizer.decode([i]) for i in my_tokenizer.encode(sample)]
    theirs = [gpt2.decode([i]) for i in gpt2.encode(sample)]

    print(f"{sample!r}  ({len(sample.encode('utf-8'))} bytes)")
    print(f"  mine ({len(mine)}): {mine}")
    print(f"  gpt2 ({len(theirs)}): {theirs}")
    print()

