export function visionConfig(env = process.env) {
 const maxTokens=Number(env.AI_MAX_TOKENS||8192);
 if(!Number.isInteger(maxTokens)||maxTokens<1024||maxTokens>32000)throw new Error('AI_MAX_TOKENS 必須為 1024–32000 的整數');
 const provider = env.AI_PROVIDER || (env.GEMINI_API_KEY ? 'gemini' : env.OPENROUTER_API_KEY ? 'openrouter' : env.MISTRAL_API_KEY ? 'mistral' : 'openai');
 if (!['codex','antigravity', 'gemini', 'openrouter', 'mistral', 'openai'].includes(provider)) throw new Error('AI_PROVIDER 必須為 codex、antigravity、gemini、openrouter、mistral 或 openai');
 if(provider==='codex'){
  const timeoutSeconds=Number(env.CODEX_TIMEOUT_SECONDS||600);
  if(!Number.isInteger(timeoutSeconds)||timeoutSeconds<30||timeoutSeconds>1800)throw Error('CODEX_TIMEOUT_SECONDS 須為 30–1800 秒的整數');
  return {provider,label:'Codex CLI',model:env.CODEX_MODEL||null,timeoutMs:timeoutSeconds*1000,maxTokens};
 }
 if (provider === 'antigravity') {
  const timeoutSeconds=Number(env.ANTIGRAVITY_TIMEOUT_SECONDS||600);
  if(!Number.isInteger(timeoutSeconds)||timeoutSeconds<30||timeoutSeconds>1800)throw Error('ANTIGRAVITY_TIMEOUT_SECONDS 須為 30–1800 秒的整數');
  return {provider,label:'Antigravity · Claude Opus 4.6',model:env.ANTIGRAVITY_MODEL||'claude-opus-4-6-thinking',maxTokens,timeoutMs:timeoutSeconds*1000};
 }
 if (provider === 'gemini') return { provider, maxTokens, label: 'Google Gemini', key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.6-flash', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' };
 if (provider === 'openrouter') return { provider, maxTokens, label: 'OpenRouter', key: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL || 'google/gemini-2.5-flash', url: 'https://openrouter.ai/api/v1/chat/completions' };
 return provider === 'mistral'
  ? { provider, maxTokens, label: 'Mistral AI', key: env.MISTRAL_API_KEY, model: env.MISTRAL_MODEL || 'mistral-small-latest', url: 'https://api.mistral.ai/v1/chat/completions' }
  : { provider, maxTokens, label: 'OpenAI', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4.1', url: 'https://api.openai.com/v1/chat/completions' };
}

export function visionImage(config, image) {
 return { type: 'image_url', image_url: config.provider === 'mistral' ? image : { url: image, detail: 'high' } };
}

export function providerError(status, label) {
 if (status === 503) return `${label} 目前暫時無法提供服務或負載過高，請稍後重試（503）`;
 if (status === 404) return `${label} 找不到指定模型，請確認模型名稱與帳戶權限（404）`;
 if (status === 402) return `${label} 可用額度不足，請檢查帳戶餘額或金鑰額度上限（402）`;
 if (status === 401 || status === 403) return `${label} 金鑰無效或沒有此模型的使用權限（${status}）`;
 if (status === 429) return `${label} 已達速率或配額限制，請稍後重試或檢查帳戶額度（429）`;
 return `${label} 服務回應 ${status}，請檢查模型設定或稍後重試`;
}
