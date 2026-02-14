"""
Archestra Node: Next.js App
Category: client
Generated on: 2026-02-14T11:32:47.960Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# Upstream Imports
import provider_pii_redaction

# --- TOPOLOGY METADATA ---
INCOMING_NODES = [
    {
        "sourceId": "provider-1771064793272",
        "sourceMod": "provider_pii_redaction",
        "label": "PII Redaction"
    }
]
OUTGOING_NODES = []

from archestra import MCPClient

config = {}

def get_client():
    # Resolve data sources
    sources = []
    sources.append(provider_pii_redaction.get_node())
    return MCPClient(id="client-1771066390573", type="t-next", config=config, sources=sources)
