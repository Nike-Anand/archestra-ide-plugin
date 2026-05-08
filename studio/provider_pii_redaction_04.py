"""
Archestra Node: PII Redaction
Category: provider
Generated on: 2026-02-15T17:46:26.998Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# Upstream Imports
import mcp_postgres_db_16

# --- TOPOLOGY METADATA ---
# This node receives data from 1 upstream node(s)
INCOMING_NODES = [
    {
        "sourceId": "mcp-1771177567416",
        "sourceMod": "mcp_postgres_db_16",
        "label": "Postgres DB"
    }
]
# This node sends data to 1 downstream node(s)
OUTGOING_NODES = [
    {
        "targetId": "client-1771177574448",
        "targetMod": "client_nextjs_app_2_48",
        "label": "Next.js App"
    }
]

from archestra import ArchestraGateway

config = {}

def get_node(registry):
    # Initialize upstream dependencies
    upstream_servers = []
    upstream_servers.append(mcp_postgres_db_16.get_node())
    
    return ArchestraGateway(
        name="PII Redaction", 
        registry=registry, 
        mcp_servers=upstream_servers, 
        **config
    )
