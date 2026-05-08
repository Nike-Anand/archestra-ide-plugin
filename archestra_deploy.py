"""
Archestra Deployment Script
Automatically generated on 2026-02-15T17:46:26.998Z
"""
from archestra import ArchestraRegistry, ArchestraOrchestrator
import sys
import os

# Ensure studio path is importable
sys.path.append(os.path.join(os.getcwd(), 'studio'))

# 1. Initialize Registry
registry = ArchestraRegistry(name="TimeToRise-Registry")

# 2. Import and Register Nodes
import mcp_postgres_db_16
registry.add_server(id="mcp-1771177567416", node=mcp_postgres_db_16.get_node())
import provider_pii_redaction_04
registry.add_provider(id="provider-1771177569504", node=provider_pii_redaction_04.get_node(registry))

# 3. Setup Orchestrator and Flows
orchestrator = ArchestraOrchestrator(name="MainOrchestrator")

# Configure Flows based on UI connections
orchestrator.add_flow(source="mcp-1771177567416", target="provider-1771177569504", options={"animated": true})
orchestrator.add_flow(source="provider-1771177569504", target="client-1771177574448", options={"animated": true})

if __name__ == "__main__":
    print("Deploying Archestra Studio Architecture from individual node files...")
    orchestrator.deploy()
