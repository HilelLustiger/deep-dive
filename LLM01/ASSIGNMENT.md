# Assignment LLM01 — How a Model Produces Text (Python)

**Topics:** text as bytes and UTF-8, tokenization, byte-pair encoding (training, encoding, decoding), pre-tokenization with regular expressions, why tokens explain odd model behavior, language models as next-token probabilities, n-gram models built by counting, smoothing, perplexity, logits and softmax, temperature, greedy decoding, top-k and top-p sampling, autoregressive generation, the context window, running a real model (GPT-2) locally

## Introduction

Every large language model, from any provider, does the same two things. It turns text into a list of numbers called **tokens**, and it repeatedly answers one question: *given the tokens so far, how likely is each possible next token?* Everything else you will see in later projects, such as chat, streaming, tool calls and agents, is built on top of that loop.

In this assignment you will build both halves yourself, without any API:

- A **tokenizer**: the byte-pair encoding (BPE) algorithm that GPT-2, GPT-4, Llama and most other models use, trained on Shakespeare. Then you will compare it with GPT-2's real tokenizer, and see why models are bad at counting the letters in "strawberry", and why Hebrew text costs more tokens than English.
- A **language model**: first one you build by counting which token follows which, so you can see exactly where every probability comes from. Then **GPT-2**, a real transformer with 124 million parameters, which runs locally on your laptop.

Between the two models sits the code that actually picks the next token: **softmax**, **temperature**, **greedy** decoding, **top-k** and **top-p**. You will write it once and run it on both models unchanged. When a provider's API later gives you a `temperature` or `top_p` parameter, you will know exactly what it does to the numbers, because you wrote it.

You will not train a neural network here. The counting model is "trained" by counting, and GPT-2 comes already trained. How training works is a different subject, and the plan for later is fine-tuning (LLM05).

The assignment has six parts, 0 to 5. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required, because the tests and later parts use them. Everything else is up to you.

### Learning outcomes

By the end of this assignment you can:

1. Explain how text becomes bytes (UTF-8) and bytes become tokens, and why a byte-level tokenizer never meets an unknown character.
2. Implement BPE training, encoding and decoding, and explain why pre-tokenization with a regular expression is needed.
3. Explain, from the tokens, why models struggle with spelling, counting letters and arithmetic, and why some languages cost more tokens.
4. Build an n-gram model by counting, smooth it, and measure it with perplexity.
5. Turn logits into probabilities with softmax, and explain exactly what temperature, top-k and top-p do to a distribution.
6. Generate text autoregressively from any model that gives next-token logits, and explain why greedy decoding repeats itself.
7. Run a real model locally, read its logits, and compare it with the counting model on the same text.

### Conventions

- **Tokens are `int`s, and a text is a `list[int]`.** No numpy in your own code. Plain lists keep every step visible. torch appears only in Part 5, and only where GPT-2 needs it.
- **Randomness goes through a `random.Random` that the caller passes in.** Never the global `random` functions. A test that creates `random.Random(0)` gets the same "random" choices on every run.
- **The data.** `data/tinyshakespeare.txt` (Part 0) is about 1.1 MB of Shakespeare's plays. Parts that need a training text and a separate test text use `text[:1_000_000]` for training and `text[1_000_000:]` for testing.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[Jurafsky & Martin — *Speech and Language Processing*, 3rd ed. draft, ch. 2 "Words and Tokens"](https://web.stanford.edu/~jurafsky/slp3/2.pdf)** (free), sections 2.3 "Unicode", 2.4 "Subword Tokenization: Byte-Pair Encoding" and 2.6.9 "Regular Expressions for BPE pre-tokenization".
   The main reading for the tokenizer: code points, how UTF-8 turns them into bytes, how BPE learns merges and applies them, and why text is split into words first.
   *Parts 1 and 2.*
2. **[Andrej Karpathy — Let's build the GPT Tokenizer](https://www.youtube.com/watch?v=zduSFxRajkE)** (video, 2h13m), with its code, **[minbpe](https://github.com/karpathy/minbpe)**.
   The same algorithm built live, in Python, then compared with OpenAI's tokenizers, and a long list of strange model behaviors that come from tokenization. Watch it after your Part 1 works, not before: its code is very close to what you write.
   *Parts 1 and 2.*
3. **[Python docs — Unicode HOWTO](https://docs.python.org/3/howto/unicode.html)**, sections "Definitions", "Encodings" and "Converting to Bytes".
   `str.encode`, `bytes.decode`, and what the `errors="replace"` argument does.
   *Part 1.*
4. **[Jurafsky & Martin, ch. 3 "N-gram Language Models"](https://web.stanford.edu/~jurafsky/slp3/3.pdf)**, sections 3.1–3.4 and 3.6.1–3.6.2.
   What a language model is, the bigram model and its probabilities from counts, perplexity, sampling sentences, and Laplace and add-k smoothing. Part 3 is this chapter in code.
   *Part 3.*
5. **[Andrej Karpathy — The spelled-out intro to language modeling: building makemore](https://karpathy.ai/zero-to-hero.html)** (video, 1h57m, second lecture in the list), the first hour only, up to where the neural network starts.
   A bigram model over characters, built by counting, sampled from, and measured with the negative log likelihood. The same idea as Part 3, on letters instead of tokens.
   *Part 3.*
6. **[Jurafsky & Martin, ch. 7 "Transformers and Pretraining"](https://web.stanford.edu/~jurafsky/slp3/7.pdf)**, sections 7.5 "The Language Modeling Head", 7.6 "Decoding" and 7.7.1 "Evaluating Large Language Models: Perplexity". You can skip 7.1–7.4, which explain what happens inside the transformer.
   Where logits come from, softmax, and greedy, random, temperature, top-k and top-p sampling, in the book's notation.
   *Parts 4 and 5.*
7. **[Hugging Face — How to generate text: using different decoding methods](https://huggingface.co/blog/how-to-generate)**, the sections "Greedy Search", "Sampling", "Top-K Sampling" and "Top-p (nucleus) sampling". Skip "Beam search".
   The same decoding methods with examples from GPT-2, including the repetition that greedy search falls into.
   *Parts 4 and 5.*

### Going deeper

The sources this assignment is based on:

- **Jurafsky & Martin, *Speech and Language Processing*, 3rd ed. draft**, chapters 2, 3 and 7, above.
- **Andrej Karpathy, [Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html)**, the lectures "The spelled-out intro to language modeling: building makemore" and "Let's build the GPT Tokenizer", and **[minbpe](https://github.com/karpathy/minbpe)**, including its `exercise.md`.

The papers behind the algorithms:

- **[Sennrich, Haddow & Birch (2016) — Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909)**. Where BPE for language models comes from.
- **[Radford et al. (2019) — Language Models are Unsupervised Multitask Learners](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)**, the GPT-2 paper, section 2.2 "Input Representation". Why GPT-2 uses BPE on bytes, and why it stops merges across categories like letters and punctuation, which is the regular expression in Part 2.
- **[Holtzman et al. (2020) — The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751)** (ICLR 2020). Why greedy and plain sampling both produce bad text, and the paper that introduced top-p (nucleus) sampling.

Other presentations:

- **[Hugging Face LLM Course — Byte-Pair Encoding tokenization](https://huggingface.co/learn/llm-course/chapter6/5)**. BPE step by step on a five-word example, and byte-level BPE in GPT-2.
- **Andrej Karpathy, "Let's build GPT: from scratch, in code, spelled out"**, in the same [Zero to Hero](https://karpathy.ai/zero-to-hero.html) list. What happens *inside* the model that produces the logits you use in Part 5. Beyond the scope of this assignment.

---

## Part 0 — Project setup

Set up the project in this folder:

- A Python 3.12 virtual environment in `.venv`.
- `requirements-dev.txt` with `pytest`, `regex`, `torch` and `transformers`. `torch` and `transformers` are only needed from Part 5, but install them now: together they take about 900 MB.
- An `lm/` package for the code (with an empty `__init__.py`), and a `tests/` folder.
- The data. Download it into `data/`, and keep `data/` out of git with a `.gitignore` in this folder:
  ```
  curl -o data/tinyshakespeare.txt https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt
  ```
  It should be 1,115,394 bytes.

Check that `pytest` runs.

---

## Part 1 — Byte-pair encoding

**File:** `lm/bpe.py`

### Text is bytes

A Python `str` is a sequence of **code points**: numbers that Unicode gives to every character. `ord("a")` is 97, `ord("ש")` is 1513, and `ord("👋")` is 128075. There are over a million possible code points, which is far too many to be a model's vocabulary. And a vocabulary of "the characters seen in training" fails on the first character that wasn't there.

**UTF-8** stores each code point as 1 to 4 **bytes**, numbers from 0 to 255:

```python
>>> list("a".encode("utf-8"))
[97]
>>> list("ש".encode("utf-8"))
[215, 169]
>>> list("👋".encode("utf-8"))
[240, 159, 145, 139]
```

So any text, in any language, is a list of numbers from 0 to 255. A tokenizer that starts from bytes has 256 basic tokens, and never meets a character it can't represent. That's what GPT-2 and most models since do.

Going back needs care. `bytes([215]).decode("utf-8")` fails, because 215 is only the first half of "ש". Passing `errors="replace"` turns invalid bytes into "�" instead of raising an error. A model can produce such a token on its own, so `decode` must not crash on it.

### The algorithm

Bytes alone make texts long: one token per byte. **Byte-pair encoding** makes them shorter by learning which bytes appear together often, and giving each such pair a token of its own. **Training** works like this:

1. Turn the training text into a list of byte values. The vocabulary starts with the 256 bytes, ids 0–255.
2. Count every pair of **adjacent** ids in the list.
3. Take the most frequent pair, and give it the next free id: 256 for the first merge, 257 for the second, and so on.
4. Replace every occurrence of that pair in the list with the new id. This is a **merge**.
5. Repeat from step 2 until the vocabulary has the size you asked for.

On the example from Wikipedia's BPE article, where `a` is 97, `b` is 98, `c` is 99 and `d` is 100:

```
aaabdaaabac      ids: 97 97 97 98 100 97 97 97 98 97 99
(97, 97) is the most frequent pair (4 times): it becomes 256
256 97 98 100 256 97 98 97 99
(256, 97) and (97, 98) appear twice each. A tie: take the one that appears first, (256, 97) → 257
257 98 100 257 98 97 99
(257, 98) → 258
258 100 258 97 99
```

**Ties:** when several pairs have the same count, take the one whose first occurrence is earliest in the list. If you count into a `dict` while walking through the list in order, that's the first key with the highest count, which is what `max(counts, key=counts.get)` returns.

Training produces two tables:

- **`merges`**: `{(97, 97): 256, (256, 97): 257, (257, 98): 258}`, from a pair to its new id, in the order they were learned.
- **`vocab`**: from every id to the bytes it stands for. Ids 0–255 are single bytes, and a merged id is the bytes of its pair joined: `vocab[256] = b"aa"`, `vocab[257] = b"aaa"`, `vocab[258] = b"aaab"`.

**Decoding** joins the bytes of each id with `vocab`, and decodes the result with `errors="replace"`.

**Encoding** new text applies the learned merges in the order they were learned. Start from the bytes. While the list has at least two ids, find, among the pairs present in it, the one with the **lowest** merge id, which is the one learned first. If no pair present is in `merges`, stop. Otherwise merge it and repeat. Order matters: 258 is made from 257, so 257 must exist in the list first.

### Write

- **`get_pair_counts(ids, counts=None) -> dict[tuple[int, int], int]`**: counts the adjacent pairs in `ids`. If `counts` is given, add to it and return it, instead of starting a new dict. Part 2 needs this, to count across many lists.
- **`merge(ids, pair, new_id) -> list[int]`**: a new list where every occurrence of `pair` is replaced by `new_id`. Walk left to right. When the pair matches at position `i`, append `new_id` and skip two places, otherwise append `ids[i]` and move one place. `merge([97, 97, 97], (97, 97), 256)` is `[256, 97]`, not `[256, 256]`.
- **`class BPETokenizer`**, with:
  - **`merges: dict[tuple[int, int], int]`** and **`vocab: dict[int, bytes]`**, as public attributes. A new tokenizer has no merges, and `vocab` holds the 256 single bytes.
  - **`train(text: str, vocab_size: int) -> None`**: learns `vocab_size - 256` merges. If at some point no pair is left, stop early.
  - **`encode(text: str) -> list[int]`** and **`decode(ids: list[int]) -> str`**.
  - A method **`_chunks(self, text: str) -> list[str]`** that returns `[text]`. `train` and `encode` work on each chunk separately: count pairs across all the chunks, and merge inside each one. With a single chunk that changes nothing yet. Part 2 overrides this one method, in a subclass.

### Test that:

Write these in `tests/test_bpe.py`.

- `get_pair_counts([1, 2, 3, 1, 2])` is `{(1, 2): 2, (2, 3): 1, (3, 1): 1}`, and adds to a `counts` dict that's passed in.
- `merge([1, 2, 3, 1, 2], (1, 2), 99)` is `[99, 3, 99]`, and `merge([97, 97, 97], (97, 97), 256)` is `[256, 97]`.
- Training on `"aaabdaaabac"` with `vocab_size=259` gives exactly the merges above, `vocab[258]` is `b"aaab"`, and encoding the same text gives `[258, 100, 258, 97, 99]`.
- After training on the first 20,000 characters of Shakespeare with `vocab_size=300`, `decode(encode(text)) == text` for `"שלום עולם 👋"` and for `"To be, or not to be"`. The tokenizer never saw Hebrew, and it still round-trips it, as bytes.
- With the same tokenizer, `text[50_000:55_000]` encodes to fewer tokens than it has bytes.
- `decode([215])` returns `"�"` and doesn't raise.

Training on 20,000 characters takes a fraction of a second. On 100,000 characters with `vocab_size=512` it takes a few seconds, which is fine for a manual run but too slow to repeat in every test.

---

## Part 2 — Splitting before merging, and a real tokenizer

**File:** `lm/split.py`, `compare_tokenizers.py`

### Why split first

Train your Part 1 tokenizer on Shakespeare, and look at its vocabulary. Many tokens end with a space, like `b"e "` or `b"d "`: the end of one word glued to the gap before the next. A few already span two words, like `b", and "`, and with more merges there are more. So the same word gets different tokens depending on what follows it, and the vocabulary fills up with combinations instead of words.

GPT-2's fix is to **split the text into chunks first**, with a regular expression, and let BPE merge only *inside* a chunk. This is **pre-tokenization**. GPT-2's pattern:

```python
GPT2_SPLIT_PATTERN = r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
```

It needs the `regex` package (`import regex`), not the built-in `re`, which doesn't understand `\p{L}`, "any letter in any language", or `\p{N}`, "any digit". Read it as alternatives, tried left to right:

- `'s|'t|'re|'ve|'m|'ll|'d`: English contractions on their own.
- ` ?\p{L}+`: a word, with **the space before it** attached. That's why GPT-2's tokens look like `" world"`.
- ` ?\p{N}+`: a run of digits, with an optional space.
- ` ?[^\s\p{L}\p{N}]+`: a run of punctuation or symbols.
- `\s+(?!\S)` and `\s+`: whitespace. The first leaves the last space of a run for the next word.

`regex.findall(GPT2_SPLIT_PATTERN, "Hello world's 123!  ok")` is `['Hello', ' world', "'s", ' 123', '!', ' ', ' ok']`.

### Write

In `lm/split.py`:

- **`GPT2_SPLIT_PATTERN`**, as above.
- **`class SplitBPETokenizer(BPETokenizer)`**, which overrides only `_chunks`, to return `regex.findall(GPT2_SPLIT_PATTERN, text)`. Everything else is inherited. This is why Part 1 put the chunking in its own method.

### A real tokenizer

GPT-2's own tokenizer is the same algorithm with this pattern, trained on 40 GB of web text, with 50,257 tokens. Load it from the `transformers` library. The first call downloads it, and later calls read it from a local cache:

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")
ids = tok.encode("Hello world")        # [15496, 995]
[tok.decode([i]) for i in ids]         # ['Hello', ' world']
```

Write **`compare_tokenizers.py`**, a script to run by hand. It trains a `SplitBPETokenizer` on the first 100,000 characters of Shakespeare with `vocab_size=512`, then prints, for each of the strings below, the number of UTF-8 bytes, and the tokens from both tokenizers (each token decoded on its own, in a list):

```python
SAMPLES = [
    "strawberry",
    " strawberry",
    "How many r's are in strawberry?",
    "12345 + 67890 = 80235",
    "שלום, מה שלומך?",
    "def add(a, b):\n    return a + b",
]
```

Look at the output, and keep it in mind for the rest of the track:

- **Letters.** `"strawberry"` is 3 GPT-2 tokens, `st`, `raw` and `berry`, and `" strawberry"` with a space is a single token. The model never sees the letters, only token ids. Counting the r's means knowing what letters each token stands for, which the model has to have learned indirectly.
- **Numbers.** `"12345"` is split into chunks of digits that don't line up with place value, which is part of why arithmetic is hard for a model.
- **Other languages.** GPT-2's training data was almost all English, so it learned few merges for Hebrew. The 15-character Hebrew question is 17 tokens, some of them half a letter, while the 31-character English question is 8. More tokens means more cost and less room in the context window. Newer tokenizers are better at this, but the effect is still there for most languages other than English.
- **Your tokenizer** has never seen Python or Hebrew either, and it falls back to bytes in the same way.

### Test that:

In `tests/test_split.py`:

- `regex.findall(GPT2_SPLIT_PATTERN, "Hello world's 123!  ok")` is the list above.
- After training a `SplitBPETokenizer` on the first 20,000 characters with `vocab_size=300`, no token in `vocab` has a space anywhere except at its start: for every value `b`, `b" " not in b[1:]`. With the Part 1 tokenizer trained the same way, some do. Check both.
- It still round-trips `"שלום עולם 👋"`.

In `tests/test_gpt2_tokenizer.py`, with GPT-2's tokenizer from `AutoTokenizer.from_pretrained("gpt2")`:

- `"strawberry"` is 3 tokens and `" strawberry"` is 1.
- `"שלום עולם"` has more GPT-2 tokens than it has characters (9).
- `"Hello world"` is `[15496, 995]`.

Load the tokenizer once for the whole file with a pytest fixture, `@pytest.fixture(scope="module")`, instead of once per test.

---

## Part 3 — A model by counting

**File:** `lm/bigram.py`

### A language model is next-token probabilities

A **language model** gives, for any list of tokens, a probability for every possible next token. A **bigram model** makes the simplest possible assumption: the next token depends only on the **last** one. To train it, count:

- `count(a, b)`: how many times token `b` came right after token `a` in the training text,
- `count(a)`: how many times `a` was followed by anything.

The probability of `b` after `a` is then `count(a, b) / count(a)`. On an unrelated example, the words in `"the cat sat on the mat"`: `the` is followed once by `cat` and once by `mat`, so P(`cat` | `the`) = 1/2.

The model has nothing to do with how the tokens were made. It works on any list of ids. In this part you train it on GPT-2's tokens, because Part 5 compares it with GPT-2 on the same tokens.

### Smoothing

A pair that never appeared in training gets probability 0. That's a problem for measuring the model (next section): one unseen pair in the test text makes the whole text "impossible". **Add-k smoothing** pretends every pair was seen `k` extra times:

```
P(b | a) = (count(a, b) + k) / (count(a) + k × V)
```

where `V` is the vocabulary size. With `k = 1` this is **Laplace smoothing**. The `k × V` in the denominator keeps the probabilities summing to 1. If `a` itself never appeared, every next token gets `1 / V`.

### Perplexity

How good is a model? Measure the probability it gives to a text it hasn't seen. Walk through the test text, and for each token take the probability the model gave it, given the token before it. The **perplexity** is

```
perplexity = exp( −(1/N) × Σ log P(token_i | token_{i−1}) )
```

over the `N` predictions (one fewer than the number of tokens). It's the inverse of the geometric mean of those probabilities. Read it as "how many tokens the model was choosing between, on average". A model that gives every token `1 / V` has perplexity exactly `V`. Lower is better. Add the logs instead of multiplying the probabilities: a product of thousands of small numbers becomes 0.0 in floating point.

### Logits for generating

Part 4 picks the next token from **logits**: one score per token, where higher means more likely, and where `softmax` (Part 4) turns the scores into probabilities. For a counting model, the logit of `b` after `a` is `log(count(a, b))`, because softmax of logs gives back the counts, normalized.

Use the **unsmoothed** counts here. Smoothing is for measuring: it makes sure no test token gets probability 0. For generating it's harmful. With 50,257 tokens and `k = 1`, a token followed by 100 different tokens in training gives over 99% of its probability to the 50,000 that never came after it, and the generated text is random garbage. Tokens that never followed `a` get a logit of `-math.inf`, which softmax turns into probability 0. If `a` was never followed by anything, return all zeros, which softmax turns into a uniform distribution.

### Write

**`class BigramModel`**:

- **`__init__(self, vocab_size: int, k: float = 1.0)`**.
- **`train(ids: list[int]) -> None`**: counts the pairs. Store the counts in nested dicts, `{a: {b: count}}`, not a `V × V` table: with GPT-2's 50,257 tokens that table would have 2.5 billion cells, almost all zero.
- **`prob(prev: int, nxt: int) -> float`**: the smoothed probability.
- **`perplexity(ids: list[int]) -> float`**.
- **`next_logits(ids: list[int]) -> list[float]`**: the unsmoothed logits for the token after `ids[-1]`, a list of length `vocab_size`. It takes the whole list, not only the last token, so that GPT-2 can have a method with the same signature in Part 5.

### Test that:

In `tests/test_bigram.py`, on the tiny training list `[0, 1, 0, 1, 0, 2]` with `vocab_size=3`:

- With `k=1`: `prob(0, 1)` is `(2 + 1) / (3 + 3) = 0.5`, and `prob(0, 0) + prob(0, 1) + prob(0, 2)` is 1 (use `pytest.approx`).
- `prob(2, 0)` is `1/3`: token 2 was never followed by anything.
- An untrained model with `vocab_size=50` has perplexity 50 on any text.
- `next_logits([0])` is `[-inf, log 2, log 1]`, and `next_logits([2])` is `[0.0, 0.0, 0.0]`.
- **Smoothing changes perplexity.** Train on GPT-2's tokens of `text[:1_000_000]` (use the tokenizer from Part 2) with `k=1` and `k=0.01`, and measure both on the first 1,024 GPT-2 tokens of `text[1_000_000:]`. The `k=0.01` model has the lower perplexity. With `k=1`, too much probability goes to pairs that never appear. Encoding a million characters with GPT-2's tokenizer takes a few seconds, so do it once in a module fixture.

---

## Part 4 — From logits to a token

**File:** `lm/sampling.py`, `lm/generate.py`

### Softmax and temperature

**Softmax** turns logits into probabilities: take `exp` of each logit, then divide by the sum, so they add up to 1. A higher logit always means a higher probability, and only the differences between logits matter: adding the same number to every logit changes nothing.

That last fact makes it safe to compute. `exp(1000)` overflows a float, so subtract the largest logit from every logit first, then exp. The largest becomes `exp(0) = 1`, and nothing overflows. `exp(-inf)` is 0, so `-inf` logits work as they are.

**Temperature** divides every logit by `T` before the softmax:

- `T = 1`: the model's own distribution.
- `T < 1`: differences get bigger, so the most likely token gets even more likely. As `T` approaches 0, all the probability goes to the top token.
- `T > 1`: differences shrink, so the distribution flattens towards uniform, and unlikely tokens get picked more often.

`T = 0` would divide by zero. By convention it means **greedy**: always take the token with the highest logit.

### Cutting the tail

Even a good model gives a little probability to thousands of bad tokens. Together they add up, and plain sampling picks one of them now and then, after which the text goes off the rails. Two ways to cut them off, applied to the probabilities after softmax:

- **Top-k**: keep the `k` most likely tokens, set the rest to 0, and divide the kept ones by their sum, so they add up to 1 again.
- **Top-p** (nucleus): sort the tokens from most to least likely, and keep the smallest number of them whose probabilities add up to at least `p`. Set the rest to 0 and renormalize. A confident model keeps few tokens, an unsure one keeps many. That's the advantage over a fixed `k`.

With probabilities `[0.5, 0.3, 0.2]`: top-k with `k = 2` gives `[0.625, 0.375, 0.0]`. Top-p with `p = 0.7` keeps 0.5 + 0.3 = 0.8 ≥ 0.7, and gives the same. Top-p with `p = 0.5` keeps only the first token: `[1.0, 0.0, 0.0]`.

### Sampling

To pick an index with given probabilities, take a uniform random number `r` in [0, 1) with `rng.random()`, and walk through the probabilities adding them up. Return the first index where the running sum goes past `r`. With `[0.5, 0.3, 0.2]`, `r = 0.65` falls between 0.5 and 0.8, so it returns 1. Floating-point sums can end a hair below 1. If the loop ends without returning, return the last index whose probability isn't 0.

### Generating

A model predicts one token. To produce text, **append** the chosen token to the list and ask again, with the longer list. Repeat. This is **autoregressive** generation, and it's how every LLM produces its answers, one token at a time.

### Write

In `lm/sampling.py`:

- **`softmax(logits, temperature=1.0) -> list[float]`**: raises `ValueError` if `temperature` isn't positive.
- **`top_k(probs, k) -> list[float]`** and **`top_p(probs, p) -> list[float]`**: new lists of the same length, renormalized. Ties at the cut can be broken any way.
- **`sample(probs, rng: random.Random) -> int`**.
- **`greedy(logits) -> int`**: the index of the largest logit.
- **`choose_next(logits, rng, temperature=1.0, k=None, p=None) -> int`**: greedy if `temperature` is 0. Otherwise softmax with the temperature, then top-k if `k` is given, then top-p if `p` is given, then sample.

In `lm/generate.py`:

- **`generate(next_logits, ids, n, rng, temperature=1.0, k=None, p=None) -> list[int]`**: `next_logits` is any function that takes a list of ids and returns logits, like `BigramModel.next_logits`. Returns `ids` (a copy, don't change the caller's list) with `n` new tokens appended.

And a script, **`generate_bigram.py`**: train a `BigramModel` with `k=0.01` on GPT-2's tokens of `text[:1_000_000]`, and print, decoded with GPT-2's tokenizer, 40 tokens generated after `"ROMEO:\n"` with `random.Random(0)` at temperature 1, and the same with temperature 0. The sampled text looks like Shakespeare for a few words at a time, and makes no sense beyond that: the model only ever sees one token back. The greedy text gets stuck, repeating the same token. Greedy always takes the same path from the same token, and a loop, once entered, never ends.

### Test that:

In `tests/test_sampling.py`:

- `softmax([1, 2, 3])` sums to 1 and is increasing. `softmax([1, 2, 3])` equals `softmax([101, 102, 103])` (approx). `softmax([1000, 1000])` is `[0.5, 0.5]`, without overflowing. `softmax([0, -inf])` is `[1, 0]`.
- **Temperature:** with logits `[1, 2, 3]`, the last probability at `temperature=0.01` is above 0.999, and at `temperature=100` all three are within 0.01 of 1/3. `temperature=0` raises `ValueError`.
- `top_k` and `top_p` on `[0.5, 0.3, 0.2]` give the three results above (approx).
- **Sampling follows the probabilities:** 10,000 calls to `sample([0.5, 0.3, 0.2], rng)` with `rng = random.Random(0)` pick each index with a frequency within 0.02 of its probability.
- `sample([0.0, 1.0, 0.0], rng)` is always 1. `greedy([1, 5, 3])` is 1. `choose_next` with `temperature=0` returns the same as `greedy`.

In `tests/test_generate.py`, with a fake `next_logits` that doesn't need a model: one that always returns `[0.0, 0.0, 5.0]`.

- `generate(fake, [0], 4, random.Random(0), temperature=0)` is `[0, 2, 2, 2, 2]`.
- The same call with the same seed and `temperature=1` returns the same list twice, and the input list `[0]` is unchanged.

---

## Part 5 — A real model

**File:** `lm/gpt2.py`, `generate_gpt2.py`

### Running GPT-2

GPT-2 is a transformer with 124 million parameters, released by OpenAI in 2019 with open weights. It's small by today's standards, about 500 MB, and runs on a laptop CPU. The `transformers` library downloads it on first use, and caches it after that:

```python
import torch
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("gpt2")
model.eval()                                   # inference mode: no training behavior

with torch.no_grad():                          # don't track gradients: faster, less memory
    out = model(torch.tensor([[15496, 995]]))  # a batch of one list of ids
out.logits.shape                               # torch.Size([1, 2, 50257])
```

The model returns logits for **every position** at once: `out.logits[0, i]` is its prediction for the token *after* position `i`, given the tokens up to `i`. For generating you need only the last one, `out.logits[0, -1]`, a vector of 50,257 numbers. `.tolist()` turns it into a plain Python list, and from there your Part 4 code takes over, unchanged.

### The context window

GPT-2 was trained on lists of at most **1,024 tokens**, its **context window**. It can't take a longer list. The usual fix when generating is to keep only the last 1,024 tokens: the model forgets everything before them. Every LLM has such a limit. Today's are in the hundreds of thousands, and LLM02 is about what happens when a conversation grows towards one.

### Perplexity for a transformer

For perplexity you need the probability of every token in the text, not just the last. One call gives the logits for every position, so call the model once on the whole text (at most 1,024 tokens), and take the log-probability of each actual next token. Here, use torch's own `torch.log_softmax(logits, dim=-1)` instead of your `softmax`: it's the same formula, applied to 1,023 vectors of 50,257 numbers at once, which would take far too long in plain Python lists.

```python
logp = torch.log_softmax(out.logits[0, :-1], dim=-1)  # predictions for positions 1..N-1
targets = torch.tensor(ids[1:])                        # what actually came next
picked = logp[torch.arange(len(targets)), targets]     # log P(actual next token), one per position
```

The perplexity is `exp(-picked.mean().item())`.

### Write

In `lm/gpt2.py`:

- **`CONTEXT = 1024`**.
- **`class GPT2`**, which loads the tokenizer and the model in `__init__` (as public attributes **`tokenizer`** and **`model`**), and has:
  - **`encode(text) -> list[int]`** and **`decode(ids) -> str`**, through the tokenizer.
  - **`next_logits(ids) -> list[float]`**: the logits after the last of `ids`, using only the last `CONTEXT` ids. Same signature as `BigramModel.next_logits`, so `generate` works with either.
  - **`perplexity(ids) -> float`**, on the first `CONTEXT` ids.

And **`generate_gpt2.py`**, a script: generate 40 tokens after `"ROMEO:\n"` with `random.Random(0)` at temperature 0.8 and `k=50`, and print them. Then print the perplexity of the bigram model (`k=0.01`, trained as in Part 4) and of GPT-2 on the first 1,024 GPT-2 tokens of `text[1_000_000:]`.

GPT-2 was trained on web pages, not plays, so its text reads like the internet even after `"ROMEO:"`. But it reads like coherent English, over whole sentences. On the Shakespeare test text, GPT-2's perplexity is around 60, and the bigram model's is in the hundreds. Both numbers are measured on the same tokens, so they can be compared.

### Test that:

In `tests/test_gpt2.py`. Load `GPT2()` once with a module fixture: loading takes a few seconds, and over a minute the first time, while it downloads.

- `next_logits` of any short list has length 50,257.
- **Your greedy decoding is the model's greedy decoding:** `generate(gpt2.next_logits, ids, 20, random.Random(0), temperature=0)` equals
  ```python
  gpt2.model.generate(torch.tensor([ids]), max_new_tokens=20, do_sample=False, pad_token_id=50256)[0].tolist()
  ```
  for `ids = gpt2.encode("ROMEO:\n")`. `do_sample=False` is greedy in `transformers`. Your loop and the library's loop pick the same tokens from the same logits.
- `next_logits` of a list of 1,500 ids doesn't fail, and equals `next_logits` of its last 1,024 ids (approx). Build the list by repeating a short text's ids.
- **GPT-2 beats counting:** on the first 1,024 GPT-2 tokens of `text[1_000_000:]`, GPT-2's perplexity is below 100, and less than a third of the bigram model's (`k=0.01`, trained on GPT-2's tokens of `text[:1_000_000]`).

---

## Running the tests

```
source .venv/bin/activate
pytest                          # everything; the GPT-2 tests take about 15 seconds
pytest --ignore=tests/test_gpt2.py
python compare_tokenizers.py
python generate_bigram.py
python generate_gpt2.py
```

## Cleaning up

None of these are in git, and none are needed after the assignment. Together they take about 2 GB:

```
pip cache purge                                       # copies of downloaded packages; run it first, while the venv is active
rm -rf .venv                                          # torch and transformers, ~900 MB
rm -rf ~/.cache/huggingface/hub/models--gpt2          # GPT-2's weights and tokenizer, ~500 MB
```

Keep `data/` if you want to run the scripts again later. It's only 1.1 MB.
