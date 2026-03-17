import pathlib
out = pathlib.Path(r"C:/Users/lucas/Desktop/Analise-de-Carteira/src/adapters/outbound/pdf_parser/pdfplumber_claude_parser.py")
NL = chr(10)
Q = chr(34)
Q3 = Q*3
SQ = chr(39)

# Build the file content correctly
# All 
 inside strings must be the two-char sequence backslash-n
BSN = chr(92) + "n"   # This is the two-char string backslash-n
BSBN = chr(92) + "n"  # same
