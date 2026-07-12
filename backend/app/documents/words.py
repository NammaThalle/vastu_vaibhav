"""Amounts in words, Indian style (lakh, crore), as written on receipts."""

ONES = ("", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
        "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen")
TENS = ("", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety")


def _below_hundred(n: int) -> str:
    if n < 20:
        return ONES[n]
    return " ".join(w for w in (TENS[n // 10], ONES[n % 10]) if w)


def _below_thousand(n: int) -> str:
    hundreds, rest = divmod(n, 100)
    parts = [f"{ONES[hundreds]} Hundred"] if hundreds else []
    if rest:
        parts.append(_below_hundred(rest))
    return " ".join(parts)


def in_words(n: int) -> str:
    """12500 -> 'Twelve Thousand Five Hundred'."""
    if n == 0:
        return "Zero"
    parts = []
    for size, name in ((10_000_000, "Crore"), (100_000, "Lakh"), (1000, "Thousand")):
        count, n = divmod(n, size)
        if count:
            parts.append(f"{in_words(count) if count >= 100 else _below_hundred(count)} {name}")
    if n:
        parts.append(_below_thousand(n))
    return " ".join(parts)


def rupees_in_words(n: int) -> str:
    return f"Rupees {in_words(n)} Only"
