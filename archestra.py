"""
Archestra Mock SDK
Provides stubs for ArchestraRegistry, ArchestraGateway, and ArchestraOrchestrator
to allow testing without the full platform installed.
"""

class MCPClient:
    def __init__(self, id, type, config):
        self.id = id
        self.type = type
        self.config = config

class ArchestraRegistry:
    def __init__(self, name):
        self.name = name
        self.servers = {}
        print(f"[Archestra] Initialized Registry: {name}")

    def add_server(self, id, type=None, config=None, node=None):
        if node:
            self.servers[id] = node
            print(f"[Archestra] Registered MCP Node from code: {id}")
        else:
            self.servers[id] = {"type": type, "config": config}
            print(f"[Archestra] Registered MCP Server: {id} (type: {type})")

    def add_provider(self, id, node):
        self.servers[id] = node
        print(f"[Archestra] Registered Provider Node from code: {id}")

class ArchestraGateway:
    def __init__(self, name, registry, mcp_servers=None, **config):
        self.name = name
        self.registry = registry
        self.config = config
        self.servers = mcp_servers or []
        print(f"[Archestra] Initialized Gateway: {name}")
        for s in self.servers:
            print(f"  -> Connected to MCP Server: {s.id}")

class ArchestraOrchestrator:
    def __init__(self, name):
        self.name = name
        self.flows = []
        print(f"[Archestra] Initialized Orchestrator: {name}")

    def add_flow(self, source, target, options=None):
        self.flows.append({"source": source, "target": target, "options": options})
        print(f"[Archestra] Flow configured: {source} -> {target}")

    def deploy(self):
        print(f"[Archestra] Deploying architecture with {len(self.flows)} flows...")
        # Simulation of deployment logic
        print("[Archestra] All nodes synchronized and operational.")
