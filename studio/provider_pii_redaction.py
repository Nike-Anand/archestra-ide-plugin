"""
Archestra Node: PII Redaction
Category: provider
Generated on: 2026-02-14T11:32:47.960Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# Upstream Imports
import mcp_test

# --- TOPOLOGY METADATA ---
INCOMING_NODES = [
    {
        "sourceId": "mcp-1771064789515",
        "sourceMod": "mcp_test",
        "label": "test"
    }
]
OUTGOING_NODES = [
    {
        "targetId": "client-1771066390573",
        "targetMod": "client_nextjs_app",
        "label": "Next.js App"
    }
]

from archestra import ArchestraGateway

config = {}

def get_node(registry):
    # Initialize upstream dependencies
    upstream_servers = []
    upstream_servers.append(mcp_test.get_node())
    
    return ArchestraGateway(
        name="PII Redaction", 
        registry=registry, 
        mcp_servers=upstream_servers, 
        **config
    )
