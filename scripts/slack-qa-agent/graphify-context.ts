import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  GraphifyAnalysisContext,
  GraphifyNodeContext,
  GraphifyEdgeContext,
} from "./types";

interface GraphJsonNode {
  id: string;
  label: string;
  source_file?: string;
  source_location?: string;
  community?: number;
  norm_label?: string;
}

interface GraphJsonLink {
  source: string;
  target: string;
  relation: string;
  source_file?: string;
  source_location?: string;
}

interface GraphJsonData {
  nodes?: GraphJsonNode[];
  links?: GraphJsonLink[];
}

export class GraphifyContextRetriever {
  private workspaceRoot: string;
  private graphJsonPath: string;
  private cachedGraph: GraphJsonData | null = null;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.graphJsonPath = path.join(workspaceRoot, "graphify-out", "graph.json");
  }

  private loadGraphJson(): GraphJsonData | null {
    if (this.cachedGraph) return this.cachedGraph;
    if (!fs.existsSync(this.graphJsonPath)) return null;
    try {
      const raw = fs.readFileSync(this.graphJsonPath, "utf-8");
      this.cachedGraph = JSON.parse(raw);
      return this.cachedGraph;
    } catch {
      return null;
    }
  }

  /**
   * Extract search terms from bug report text.
   */
  public extractSearchTerms(bugText: string): string[] {
    const rawTokens = bugText
      .replace(/[^\w\s/.-]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

    const stopWords = new Set([
      "the", "and", "for", "with", "this", "that", "from", "when", "what",
      "where", "have", "here", "there", "then", "into", "onto", "button",
      "page", "click", "user", "error", "issue", "bug", "broken", "fails",
      "does", "cant", "cannot", "doesnt", "should", "could", "would", "please"
    ]);

    const terms: string[] = [];
    for (const token of rawTokens) {
      const lower = token.toLowerCase();
      if (!stopWords.has(lower) && !terms.includes(lower)) {
        terms.push(lower);
      }
    }

    // Also look for camelCase or kebab-case occurrences
    const specialTokens = bugText.match(/[a-zA-Z]+(?:[A-Z][a-z]+)+|[a-z0-9]+-[a-z0-9-]+/g) || [];
    for (const st of specialTokens) {
      const lower = st.toLowerCase();
      if (!terms.includes(lower)) {
        terms.unshift(lower);
      }
    }

    return terms.slice(0, 10);
  }

  /**
   * Query CLI if available
   */
  public queryCli(query: string): string {
    try {
      const output = execSync(`graphify query "${query.replace(/"/g, '\\"')}"`, {
        cwd: this.workspaceRoot,
        encoding: "utf-8",
        timeout: 10000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      return output;
    } catch {
      return "";
    }
  }

  /**
   * Retrieve nodes and links matching terms from graph.json
   */
  public searchGraph(terms: string[]): {
    nodes: GraphifyNodeContext[];
    edges: GraphifyEdgeContext[];
    files: string[];
  } {
    const graph = this.loadGraphJson();
    if (!graph || !graph.nodes) {
      return { nodes: [], edges: [], files: [] };
    }

    const scoredNodes: Array<{ node: GraphJsonNode; score: number }> = [];
    const lowerTerms = terms.map((t) => t.toLowerCase());

    for (const node of graph.nodes) {
      if (!node.source_file) continue;
      let score = 0;
      const label = (node.label || "").toLowerCase();
      const normLabel = (node.norm_label || "").toLowerCase();
      const file = (node.source_file || "").toLowerCase();

      for (const term of lowerTerms) {
        if (label === term) score += 10;
        else if (label.includes(term)) score += 5;

        if (normLabel.includes(term)) score += 3;
        if (file.includes(term)) score += 4;
      }

      if (score > 0) {
        scoredNodes.push({ node, score });
      }
    }

    // Sort by descending score
    scoredNodes.sort((a, b) => b.score - a.score);
    const topScored = scoredNodes.slice(0, 15);
    const matchedNodeIds = new Set(topScored.map((s) => s.node.id));

    const matchedNodes: GraphifyNodeContext[] = topScored.map(({ node }) => {
      const locMatch = (node.source_location || "L1").match(/L(\d+)/);
      const line = locMatch ? parseInt(locMatch[1], 10) : 1;
      return {
        name: node.label,
        file: node.source_file || "",
        line,
        community: node.community,
      };
    });

    const matchedEdges: GraphifyEdgeContext[] = [];
    if (graph.links) {
      for (const link of graph.links) {
        if (matchedNodeIds.has(link.source) || matchedNodeIds.has(link.target)) {
          matchedEdges.push({
            from: link.source,
            relation: link.relation,
            to: link.target,
          });
          if (matchedEdges.length >= 20) break;
        }
      }
    }

    const files = Array.from(new Set(matchedNodes.map((n) => n.file)));
    return { nodes: matchedNodes, edges: matchedEdges, files };
  }

  /**
   * Reads snippet slices around discovered node line locations
   */
  public assembleCodeContext(nodes: GraphifyNodeContext[]): string {
    const fileLineMap = new Map<string, number[]>();

    for (const node of nodes) {
      if (!node.file) continue;
      if (!fileLineMap.has(node.file)) {
        fileLineMap.set(node.file, []);
      }
      fileLineMap.get(node.file)!.push(node.line);
    }

    const snippets: string[] = [];

    for (const [relPath, lines] of fileLineMap.entries()) {
      const fullPath = path.join(this.workspaceRoot, relPath);
      if (!fs.existsSync(fullPath)) continue;

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const allLines = content.split("\n");

        for (const lineNum of lines.slice(0, 3)) {
          const start = Math.max(0, lineNum - 25);
          const end = Math.min(allLines.length, lineNum + 40);
          const slice = allLines
            .slice(start, end)
            .map((l, idx) => `${start + idx + 1}: ${l}`)
            .join("\n");

          snippets.push(
            `### File: ${relPath} (Around line ${lineNum})\n\`\`\`typescript\n${slice}\n\`\`\``
          );
        }
      } catch {
        // ignore unreadable file
      }
    }

    return snippets.join("\n\n");
  }

  /**
   * Main context retrieval method
   */
  public getAnalysisContext(bugText: string): GraphifyAnalysisContext {
    const queryTerms = this.extractSearchTerms(bugText);
    const { nodes, edges, files } = this.searchGraph(queryTerms);

    // Also run CLI query for top query term if few nodes found
    if (nodes.length < 3 && queryTerms.length > 0) {
      const cliOut = this.queryCli(queryTerms.slice(0, 3).join(" "));
      const cliMatches = cliOut.matchAll(/NODE\s+([^\s]+)\s+\[src=([^\s]+)\s+loc=L(\d+)/g);
      for (const m of cliMatches) {
        const name = m[1];
        const file = m[2];
        const line = parseInt(m[3], 10);
        if (!nodes.some((n) => n.file === file && n.line === line)) {
          nodes.push({ name, file, line });
          if (!files.includes(file)) files.push(file);
        }
      }
    }

    const assembledCodeContext = this.assembleCodeContext(nodes);

    return {
      queryTerms,
      matchedNodes: nodes,
      matchedEdges: edges,
      relevantFiles: files,
      assembledCodeContext,
    };
  }
}
