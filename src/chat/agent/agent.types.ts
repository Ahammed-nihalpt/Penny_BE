// LangChain-free types + DI token, so consumers (ChatService, tests) don't pull
// in the LangGraph/ESM module graph just to reference the agent's contract.

export interface AgentAction {
  tool: string;
  invoiceIds: string[];
}

export interface AgentResult {
  reply: string;
  actions: AgentAction[];
}

export interface IAgentService {
  run(
    userId: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    signal?: AbortSignal,
    // When provided, the agent streams the reply token-by-token via this callback
    // (the final assembled reply is still returned in AgentResult).
    onToken?: (token: string) => void,
  ): Promise<AgentResult>;
}

export const AGENT_SERVICE = Symbol('AGENT_SERVICE');
