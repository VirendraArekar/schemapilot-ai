import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
} from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.geminiApiKey');
    this.model = this.configService.get<string>('ai.geminiModel') || 'gemini-3.8-flash';
    if (this.model === 'gemini-2.5-flash') {
      this.model = 'gemini-3.8-flash';
    }
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in your environment to use AI generation.',
      );
    }

    const maxRetries = 2;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const start = Date.now();
      try {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: request.userPrompt,
          config: {
            systemInstruction: request.systemPrompt,
            temperature: request.temperature ?? 0.2,
            ...(request.jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        });

        const text = response.text || '';
        const usage = response.usageMetadata;
        return {
          text,
          provider: this.name,
          model: this.model,
          promptTokens: usage?.promptTokenCount || 0,
          completionTokens: usage?.candidatesTokenCount || 0,
          totalTokens: usage?.totalTokenCount || 0,
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        lastError = err;
        this.logger.warn(`Gemini attempt ${attempt + 1} failed: ${(err as Error).message}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }

    throw new ServiceUnavailableException(
      `AI generation failed after retries: ${(lastError as Error)?.message || 'Unknown error'}`,
    );
  }
}
