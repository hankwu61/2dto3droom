import test from 'node:test';
import assert from 'node:assert/strict';
import {isLocalOrigin,localOrigin} from '../local-origin.js';
test('loopback frontend allows Vite fallback ports and IPv6',()=>{for(const origin of [undefined,'http://localhost:5173','http://127.0.0.1:5174','http://localhost:5175','http://[::1]:5174','https://localhost:3001'])assert.equal(isLocalOrigin(origin),true,origin);});
test('foreign, opaque, malformed and hostname lookalike origins remain forbidden',()=>{for(const origin of ['null','https://evil.example','http://localhost.evil.example:5174','http://127.0.0.1.evil.example','file://localhost','http://user@localhost:5174','http://localhost:5174/path','not a URL'])assert.equal(isLocalOrigin(origin),false,origin);});
test('middleware advances local requests and returns actionable 403 for external requests',()=>{let called=false;localOrigin({get:()=> 'http://127.0.0.1:5174'},null,()=>called=true);assert.ok(called);let status,body;const res={status(n){status=n;return this;},json(v){body=v;}};localOrigin({get:()=> 'https://evil.example'},res,()=>assert.fail());assert.equal(status,403);assert.match(body.error,/本機/);});
