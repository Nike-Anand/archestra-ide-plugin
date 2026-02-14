"""
Archestra Node: API Gateway
Category: provider
Generated on: 2026-02-14T14:31:24.527Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# Upstream Imports
import mcp_stripe_api_55

# --- TOPOLOGY METADATA ---
INCOMING_NODES = [
    {
        "sourceId": "mcp-1771079450955",
        "sourceMod": "mcp_stripe_api_55",
        "label": "Stripe API"
    }
]
OUTGOING_NODES = [
    {
        "targetId": "client-1771079437924",
        "targetMod": "client_cli_tool_24",
        "label": "CLI Tool"
    }
]

from archestra import ArchestraGateway

config = {}

def get_node(registry):
    # Initialize upstream dependencies
    upstream_servers = []
    upstream_servers.append(mcp_stripe_api_55.get_node())
    
    return ArchestraGateway(
        name="API Gateway", 
        registry=registry, 
        mcp_servers=upstream_servers, 
        **config
    )
