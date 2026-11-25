export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
}

export interface AiCompletionResponse {
  text: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface AiProvider {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
