"""
Archestra Deployment Script
Automatically generated on 2026-02-14T11:32:47.960Z
"""
from archestra import ArchestraRegistry, ArchestraOrchestrator
import sys
import os

# Ensure studio path is importable
sys.path.append(os.path.join(os.getcwd(), 'studio'))

# 1. Initialize Registry
registry = ArchestraRegistry(name="TimeToRise-Registry")

# 2. Import and Register Nodes
import provider_api_gateway
registry.add_provider(id="provider-1771064099789", node=provider_api_gateway.get_node(registry))
import mcp_test
registry.add_server(id="mcp-1771064789515", node=mcp_test.get_node())
import provider_pii_redaction
registry.add_provider(id="provider-1771064793272", node=provider_pii_redaction.get_node(registry))
import mcp_slack_bot
registry.add_server(id="mcp-1771067062788", node=mcp_slack_bot.get_node())
import provider_auth_guard
registry.add_provider(id="provider-1771067064894", node=provider_auth_guard.get_node(registry))

# 3. Setup Orchestrator and Flows
orchestrator = ArchestraOrchestrator(name="MainOrchestrator")

# Configure Flows based on UI connections
orchestrator.add_flow(source="provider-1771064099789", target="client-1771064329926", options={"animated": true})
orchestrator.add_flow(source="mcp-1771064789515", target="provider-1771064793272", options={"animated": true})
orchestrator.add_flow(source="provider-1771064793272", target="client-1771066390573", options={"animated": true})
orchestrator.add_flow(source="mcp-1771067062788", target="provider-1771067064894", options={"animated": true})

if __name__ == "__main__":
    print("Deploying Archestra Studio Architecture from individual node files...")
    orchestrator.deploy()
