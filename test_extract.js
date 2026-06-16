function extractCardNumber(text) {
  const normalized = text
    .replace(/[Oo]/g, '0')
    .replace(/[lI]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8');

  const patterns = [
    /\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/g,
    /\b(\d{16})\b/g,
    /\b(\d{13,19})\b/g,
  ];

  for (const pattern of patterns) {
    const matches = [...normalized.matchAll(pattern)];
    if (matches.length > 0) {
      const best = matches.reduce((prev, curr) => {
        const pd = prev[1].replace(/\D/g, '').length;
        const cd = curr[1].replace(/\D/g, '').length;
        return Math.abs(cd - 16) < Math.abs(pd - 16) ? curr : prev;
      });
      return best[1].replace(/\D/g, '');
    }
  }
  return null;
}

const text = "9238 1299 7183 1286\r\nMARIA C. FIGUEREDO C.\r\nCUP\r\nVENCE: 07/32\r\nred\r\n";
console.log(extractCardNumber(text));
