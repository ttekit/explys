export interface SlackBugReport {
  id: string;
  reporter: string;
  channel?: string;
  threadTs?: string;
  text: string;
  title?: string;
  reportedAt?: string;
  responseUrl?: string;
  jiraIssueKey?: string;
  jiraIssueUrl?: string;
}

export interface GraphifyNodeContext {
  name: string;
  file: string;
  line: number;
  community?: number;
  snippet?: string;
}

export interface GraphifyEdgeContext {
  from: string;
  relation: string;
  to: string;
}

export interface GraphifyAnalysisContext {
  queryTerms: string[];
  matchedNodes: GraphifyNodeContext[];
  matchedEdges: GraphifyEdgeContext[];
  relevantFiles: string[];
  assembledCodeContext: string;
}

export interface FileChange {
  path: string;
  action: "modify" | "create" | "delete";
  explanation: string;
  originalSnippet?: string;
  replacementContent?: string;
  newContent?: string;
}

export interface GeminiFixProposal {
  bugSummary: string;
  rootCauseAnalysis: string;
  filesToModify: FileChange[];
  qaVerificationSteps: string[];
  devReviewNotes: string;
}

export interface VerificationResult {
  success: boolean;
  typeCheckPassed: boolean;
  testsPassed: boolean;
  summary: string;
  errors: string[];
  output: string;
}

export interface PullRequestResult {
  prNumber: number;
  prUrl: string;
  branchName: string;
  baseBranch: string;
  previewUrl: string;
  title: string;
  body: string;
}

export interface AgentRunOptions {
  bugText: string;
  jiraUrl?: string;
  jiraIssueKey?: string;
  reporter?: string;
  channel?: string;
  threadTs?: string;
  baseBranch?: string;
  dryRun?: boolean;
  skipVerification?: boolean;
  model?: string;
}
