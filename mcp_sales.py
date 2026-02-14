from fastmcp import FastMCP

mcp = FastMCP("Sales-Analyzer")

@mcp.tool()
async def analyze_sales(month: str) -> str:
    """Analyze sales for a given month."""
    return f"Sales analysis for {month}: Growth is 15%."

if __name__ == "__main__":
    mcp.run()
