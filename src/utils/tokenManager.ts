import type { UsageMetadata } from '../types/vision';

const KEY_PROMPT_TOKENS = 'mv_total_prompt_tokens';
const KEY_CANDIDATE_TOKENS = 'mv_total_candidate_tokens';
const KEY_TOTAL_TOKENS = 'mv_total_used_tokens';
const KEY_REQUEST_COUNT = 'mv_total_request_count';

export interface AccumulatedTokenUsage {
  totalPromptTokens: number;
  totalCandidateTokens: number;
  totalUsedTokens: number;
  requestCount: number;
}

export function getAccumulatedTokenUsage(): AccumulatedTokenUsage {
  const prompt = parseInt(localStorage.getItem(KEY_PROMPT_TOKENS) || '0', 10);
  const candidate = parseInt(localStorage.getItem(KEY_CANDIDATE_TOKENS) || '0', 10);
  const total = parseInt(localStorage.getItem(KEY_TOTAL_TOKENS) || '0', 10);
  const count = parseInt(localStorage.getItem(KEY_REQUEST_COUNT) || '0', 10);

  return {
    totalPromptTokens: isNaN(prompt) ? 0 : prompt,
    totalCandidateTokens: isNaN(candidate) ? 0 : candidate,
    totalUsedTokens: isNaN(total) ? 0 : total,
    requestCount: isNaN(count) ? 0 : count,
  };
}

export function recordTokenUsage(usage: UsageMetadata): AccumulatedTokenUsage {
  const current = getAccumulatedTokenUsage();

  const newPrompt = current.totalPromptTokens + (usage.promptTokenCount || 0);
  const newCandidate = current.totalCandidateTokens + (usage.candidatesTokenCount || 0);
  const newTotal = current.totalUsedTokens + (usage.totalTokenCount || (usage.promptTokenCount + usage.candidatesTokenCount));
  const newCount = current.requestCount + 1;

  localStorage.setItem(KEY_PROMPT_TOKENS, newPrompt.toString());
  localStorage.setItem(KEY_CANDIDATE_TOKENS, newCandidate.toString());
  localStorage.setItem(KEY_TOTAL_TOKENS, newTotal.toString());
  localStorage.setItem(KEY_REQUEST_COUNT, newCount.toString());

  return {
    totalPromptTokens: newPrompt,
    totalCandidateTokens: newCandidate,
    totalUsedTokens: newTotal,
    requestCount: newCount,
  };
}

export function resetTokenUsage(): AccumulatedTokenUsage {
  localStorage.setItem(KEY_PROMPT_TOKENS, '0');
  localStorage.setItem(KEY_CANDIDATE_TOKENS, '0');
  localStorage.setItem(KEY_TOTAL_TOKENS, '0');
  localStorage.setItem(KEY_REQUEST_COUNT, '0');

  return {
    totalPromptTokens: 0,
    totalCandidateTokens: 0,
    totalUsedTokens: 0,
    requestCount: 0,
  };
}
