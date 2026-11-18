import regex

from lm.bpe import BPETokenizer

GPT2_SPLIT_PATTERN = r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""

class SplitBPETokenizer(BPETokenizer):
    def _chunks(self, text: str) -> list[str]:
        return regex.findall(GPT2_SPLIT_PATTERN, text)