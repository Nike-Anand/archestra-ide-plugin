"""
Archestra Deployment Script
Automatically generated on 2026-02-14T14:31:24.527Z
"""
from archestra import ArchestraRegistry, ArchestraOrchestrator
import sys
import os

# Ensure studio path is importable
sys.path.append(os.path.join(os.getcwd(), 'studio'))

# 1. Initialize Registry
registry = ArchestraRegistry(name="TimeToRise-Registry")

# 2. Import and Register Nodes
import mcp_stripe_api_55
registry.add_server(id="mcp-1771079450955", node=mcp_stripe_api_55.get_node())
import provider_api_gateway_37
registry.add_provider(id="provider-1771079452537", node=provider_api_gateway_37.get_node(registry))
import provider_api_gateway_2_48
registry.add_provider(id="provider-1771079456548", node=provider_api_gateway_2_48.get_node(registry))

# 3. Setup Orchestrator and Flows
orchestrator = ArchestraOrchestrator(name="MainOrchestrator")

# Configure Flows based on UI connections
orchestrator.add_flow(source="mcp-1771079450955", target="provider-1771079452537", options={"animated": true})
orchestrator.add_flow(source="provider-1771079452537", target="client-1771079437924", options={"animated": true})

if __name__ == "__main__":
    print("Deploying Archestra Studio Architecture from individual node files...")
    orchestrator.deploy()
