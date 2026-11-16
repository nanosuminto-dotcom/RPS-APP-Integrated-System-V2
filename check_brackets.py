import re

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

scripts = re.findall(r'<script\b[^>]*>([\s\S]*?)</script>', text, re.IGNORECASE)
script = scripts[-1]

stack = []
line_no = 1
col_no = 1
in_string = None
in_comment = None
escaped = False

errors = []
quote_chars = ('"', "'", '`')

for idx, ch in enumerate(script):
    if ch == '\n':
        line_no += 1
        col_no = 1
        if in_comment == '//':
            in_comment = None
        continue
    else:
        col_no += 1

    if in_comment:
        if in_comment == '/*' and ch == '/' and script[idx-1] == '*':
            in_comment = None
        continue

    if in_string:
        if escaped:
            escaped = False
        elif ch == '\\':
            escaped = True
        elif ch == in_string:
            in_string = None
        continue

    if ch in quote_chars:
        in_string = ch
        continue

    if ch == '/' and idx + 1 < len(script):
        nxt = script[idx+1]
        if nxt == '/':
            in_comment = '//'
            continue
        elif nxt == '*':
            in_comment = '/*'
            continue

    if ch in '([{':
        stack.append((ch, line_no, col_no))
    elif ch in ')]}':
        if not stack:
            errors.append(f'Unmatched closing {ch} at line {line_no}:{col_no}')
        else:
            top, tl, tc = stack.pop()
            expected = {')':'(', ']':'[', '}':'{'}[ch]
            if top != expected:
                errors.append(f'Mismatched {ch} at line {line_no}:{col_no}, expected closing for {top} from line {tl}:{tc}')

if in_string:
    errors.append(f'Unterminated string {in_string}')
if in_comment == '/*':
    errors.append('Unterminated comment /*')
if stack:
    for top, tl, tc in stack[-5:]:
        errors.append(f'Unclosed {top} from line {tl}:{tc}')

print('Bracket check errors:', len(errors))
for err in errors[:10]:
    print(' ', err)
