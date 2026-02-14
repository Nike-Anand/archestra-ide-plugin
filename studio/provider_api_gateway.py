"""
Archestra Node: API Gateway
Category: provider
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
        "targetId": "client-1771064329926",
        "targetMod": "client_cli_tool",
        "label": "CLI Tool"
    }
]

from archestra import ArchestraGateway

config = {}

def get_node(registry):
    # Initialize upstream dependencies
    upstream_servers = []
    
    return ArchestraGateway(
        name="API Gateway", 
        registry=registry, 
        mcp_servers=upstream_servers, 
        **config
    )
