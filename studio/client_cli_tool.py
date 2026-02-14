"""
Archestra Node: CLI Tool
Category: client
Generated on: 2026-02-14T11:32:47.960Z
"""
import os
import sys

# Ensure we can import other nodes in the studio
sys.path.append(os.path.dirname(__file__))

# --- TOPOLOGY METADATA ---
INCOMING_NODES = []
OUTGOING_NODES = []

from archestra import MCPClient

config = {}

def get_client():
    # Resolve data sources
    sources = []
    return MCPClient(id="client-1771067067901", type="t-cli", config=config, sources=sources)
