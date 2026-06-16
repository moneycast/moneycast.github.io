import re

def extract_card_number(text):
    normalized = text.replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1').replace('S', '5').replace('s', '5').replace('B', '8').replace('b', '8')
    
    patterns = [
        r'\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b',
        r'\b(\d{16})\b',
        r'\b(\d{13,19})\b',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, normalized)
        if matches:
            best = min(matches, key=lambda m: abs(len(re.sub(r'\D', '', m)) - 16))
            return re.sub(r'\D', '', best)
    
    return None

text = "9238 1299 7183 1286\r\nMARIA C. FIGUEREDO C.\r\nCUP\r\nVENCE: 07/32\r\nred\r\n"
print(repr(extract_card_number(text)))
