import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visionConfig,visionImage,providerError} from '../vision.js';
test('Gemini uses the requested model and Google endpoint without other provider credentials',()=>{
 const c=visionConfig({GEMINI_API_KEY:'google-test',OPENROUTER_API_KEY:'other'});
 assert.equal(c.provider,'gemini');assert.equal(c.key,'google-test');assert.equal(c.model,'gemini-3.6-flash');
 assert.equal(c.url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
 assert.equal(visionConfig({AI_PROVIDER:'gemini',OPENROUTER_API_KEY:'other'}).key,undefined);
 assert.equal(visionConfig({AI_PROVIDER:'gemini',GEMINI_MODEL:'custom'}).model,'custom');
 assert.deepEqual(visionImage(c,'image'),{type:'image_url',image_url:{url:'image',detail:'high'}});
 assert.match(providerError(404,c.label),/找不到指定模型/);
});
test('output token reservation has a bounded configurable default',()=>{
 assert.equal(visionConfig({}).maxTokens,8192);
 assert.equal(visionConfig({AI_MAX_TOKENS:'4096'}).maxTokens,4096);
 assert.throws(()=>visionConfig({AI_MAX_TOKENS:'NaN'}));
});
test('OpenRouter uses its own key, endpoint, configurable vision model and image format',()=>{
 const c=visionConfig({OPENROUTER_API_KEY:'router-test',MISTRAL_API_KEY:'other'});
 assert.equal(c.provider,'openrouter');assert.equal(c.key,'router-test');
 assert.equal(c.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(c.model,'google/gemini-2.5-flash');
 assert.deepEqual(visionImage(c,'image'),{type:'image_url',image_url:{url:'image',detail:'high'}});
 assert.equal(visionConfig({AI_PROVIDER:'openrouter',OPENROUTER_MODEL:'custom'}).model,'custom');
 assert.equal(visionConfig({AI_PROVIDER:'openrouter',MISTRAL_API_KEY:'other'}).key,undefined);
 assert.match(providerError(402,'OpenRouter'),/額度不足/);
});
test('Mistral key chooses its own endpoint and vision model',()=>{
 const c=visionConfig({MISTRAL_API_KEY:'test-secret'});
 assert.equal(c.provider,'mistral');assert.equal(c.model,'mistral-small-latest');
 assert.equal(c.url,'https://api.mistral.ai/v1/chat/completions');assert.equal(c.key,'test-secret');
 assert.deepEqual(visionImage(c,'data:image/png;base64,abc'),{type:'image_url',image_url:'data:image/png;base64,abc'});
});
test('explicit provider does not use the other provider key',()=>{
 const c=visionConfig({AI_PROVIDER:'openai',MISTRAL_API_KEY:'test-secret'});assert.equal(c.key,undefined);
 assert.throws(()=>visionConfig({AI_PROVIDER:'invalid'}));
});
test('OpenAI remains compatible and model overrides work',()=>{
 const c=visionConfig({OPENAI_API_KEY:'test',OPENAI_MODEL:'custom'});assert.equal(c.model,'custom');
 assert.deepEqual(visionImage(c,'image'),{type:'image_url',image_url:{url:'image',detail:'high'}});
 assert.equal(visionConfig({AI_PROVIDER:'mistral',MISTRAL_MODEL:'custom'}).model,'custom');
});
test('provider failures explain authentication and quota errors',()=>{
 assert.match(providerError(401,'Mistral AI'),/金鑰無效/);assert.match(providerError(429,'Mistral AI'),/配額/);
});
