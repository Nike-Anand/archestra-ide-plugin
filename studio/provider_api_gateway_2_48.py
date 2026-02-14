"""
Archestra Node: API Gateway 2
Category: provider
Generated on: 2026-02-14T14:31:24.527Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# --- TOPOLOGY METADATA ---
INCOMING_NODES = []
OUTGOING_NODES = []

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
