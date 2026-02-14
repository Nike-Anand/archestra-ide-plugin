"""
Archestra Node: CLI Tool
Category: client
Generated on: 2026-02-14T14:31:24.527Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# Upstream Imports
import provider_api_gateway_37

# --- TOPOLOGY METADATA ---
INCOMING_NODES = [
    {
        "sourceId": "provider-1771079452537",
        "sourceMod": "provider_api_gateway_37",
        "label": "API Gateway"
    }
]
OUTGOING_NODES = []

from archestra import MCPClient

config = {}

def get_client():
    # Resolve data sources
    sources = []
    sources.append(provider_api_gateway_37.get_node())
    return MCPClient(id="client-1771079437924", type="t-cli", config=config, sources=sources)
