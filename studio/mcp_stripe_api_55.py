"""
Archestra Node: Stripe API
Category: mcp
Generated on: 2026-02-14T14:31:24.527Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# --- TOPOLOGY METADATA ---
INCOMING_NODES = []
OUTGOING_NODES = [
    {
        "targetId": "provider-1771079452537",
        "targetMod": "provider_api_gateway_37",
        "label": "API Gateway"
    }
]

from archestra import MCPClient

config = {}

def get_node():
    return MCPClient(id="mcp-1771079450955", type="t-stripe", config=config)
