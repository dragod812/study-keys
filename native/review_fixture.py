"""Development preview only; never bundled or installed. Exact fixture paths."""
import json
import sys
from pathlib import Path
from host import Library
root = Path(__file__).resolve().parent.parent / '.preview'
message = json.load(sys.stdin)
allowed = [(root / 'review-fixtures' / name).as_uri() for name in ['Architecture.md', 'Report.html']]
if message.get('url') not in allowed:
    raise ValueError('Only isolated review fixtures are available in this preview.')
message['op'] = message.pop('action')
print(json.dumps(Library(root / 'review-library').request(message)))
