"""
Archestra Node: test
Category: mcp
Generated on: 2026-02-14T11:32:47.960Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# --- TOPOLOGY METADATA ---
INCOMING_NODES = []
OUTGOING_NODES = [
    {
        "targetId": "provider-1771064793272",
        "targetMod": "provider_pii_redaction",
        "label": "PII Redaction"
    }
]

from archestra import MCPClient

config = {}

def get_node():
    return MCPClient(id="mcp-1771064789515", type="t-slack", config=config)
