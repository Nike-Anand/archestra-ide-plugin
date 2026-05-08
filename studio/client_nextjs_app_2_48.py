"""
Archestra Node: Next.js App 2
Category: client
Generated on: 2026-02-15T17:46:26.998Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# Upstream Imports
import provider_pii_redaction_04

# --- TOPOLOGY METADATA ---
# This node receives data from 1 upstream node(s)
INCOMING_NODES = [
    {
        "sourceId": "provider-1771177569504",
        "sourceMod": "provider_pii_redaction_04",
        "label": "PII Redaction"
    }
]
# This node sends data to 0 downstream node(s)
OUTGOING_NODES = []

from archestra import MCPClient

config = {}

def get_client():
    # Resolve data sources
    sources = []
    sources.append(provider_pii_redaction_04.get_node())
    return MCPClient(id="client-1771177574448", type="t-next", config=config, sources=sources)
