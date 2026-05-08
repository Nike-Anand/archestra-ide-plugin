"""
Archestra Node: Postgres DB
Category: mcp
Generated on: 2026-02-15T17:46:26.998Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# --- TOPOLOGY METADATA ---
# This node receives data from 0 upstream node(s)
INCOMING_NODES = []
# This node sends data to 1 downstream node(s)
OUTGOING_NODES = [
    {
        "targetId": "provider-1771177569504",
        "targetMod": "provider_pii_redaction_04",
        "label": "PII Redaction"
    }
]

from archestra import MCPClient

config = {}

def get_node():
    return MCPClient(id="mcp-1771177567416", type="t-pg", config=config)
