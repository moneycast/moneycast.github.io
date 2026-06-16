const text = "9238 1299 7183 1286\r\nMARIA C. FIGUEREDO C.\r\nCUP\r\nVENCE: 07/32\r\nred\r\n";
const match = text.match(/(?:\d[ \-]*?){15,19}/);
console.log(match ? match[0].replace(/\D/g, '') : "No match");

const text2 = "1234-5678-9012-3456 foo bar 123";
const match2 = text2.match(/(?:\d[ \-]*?){15,19}/);
console.log(match2 ? match2[0].replace(/\D/g, '') : "No match");
