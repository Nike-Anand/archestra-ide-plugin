"""
Archestra Node: Slack Bot
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
        "targetId": "provider-1771067064894",
        "targetMod": "provider_auth_guard",
        "label": "Auth Guard"
    }
]

from archestra import MCPClient

config = {}

def get_node():
    return MCPClient(id="mcp-1771067062788", type="t-slack", config=config)
