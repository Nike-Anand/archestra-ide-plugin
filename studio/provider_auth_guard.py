"""
Archestra Node: Auth Guard
Category: provider
Generated on: 2026-02-14T11:32:47.960Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# Upstream Imports
import mcp_slack_bot

# --- TOPOLOGY METADATA ---
INCOMING_NODES = [
    {
        "sourceId": "mcp-1771067062788",
        "sourceMod": "mcp_slack_bot",
        "label": "Slack Bot"
    }
]
OUTGOING_NODES = []

from archestra import ArchestraGateway

config = {}

def get_node(registry):
    # Initialize upstream dependencies
    upstream_servers = []
    upstream_servers.append(mcp_slack_bot.get_node())
    
    return ArchestraGateway(
        name="Auth Guard", 
        registry=registry, 
        mcp_servers=upstream_servers, 
        **config
    )
