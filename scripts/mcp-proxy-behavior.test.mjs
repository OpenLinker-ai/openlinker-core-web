import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {registerHooks} from "node:module";
import {fileURLToPath,pathToFileURL} from "node:url";
import test from "node:test";
import ts from "typescript";
const root=new URL("../src/",import.meta.url);
registerHooks({
 resolve(specifier,context,next){
  if(specifier==="@/lib/api-root")return {url:"data:text/javascript,"+encodeURIComponent('export const getApiBaseUrlForRequest=()=>"https://core.example.test";'),shortCircuit:true};
  if(specifier.startsWith("@/")){const p=fileURLToPath(new URL(specifier.slice(2),root));const resolved=[p,p+".ts",p+".tsx"].find(existsSync);return next(pathToFileURL(resolved).href,context);}return next(specifier,context);
 },
 load(url,context,next){if(url.startsWith(root.href)&&/\.tsx?$/.test(url))return {format:"module",shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context);}
});
const {proxyMcpRequest}=await import("../src/lib/mcp-proxy.ts");
const {POST:scopedPOST,GET:scopedGET}=await import("../src/app/mcp/agents/[id]/route.ts");
const {POST:platformPOST}=await import("../src/app/mcp/route.ts");
const id="00000000-0000-4000-8000-000000000003";
test("real platform and scoped routes forward only protocol headers and preserve JSON-RPC responses",async()=>{
 const original=globalThis.fetch;const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',{headers:{"content-type":"application/json","mcp-session-id":"test-session","cache-control":"no-store","set-cookie":"must-not-forward=1"}});};
 try{
  for(const [handler,path] of [[platformPOST,"/api/v1/mcp"],[scopedPOST,"/api/v1/mcp/agents/"+id]]){
   const req=new Request("https://web.example.test/mcp",{method:"POST",headers:{"authorization":"Bearer synthetic","content-type":"application/json","cookie":"private=session","x-forwarded-user":"spoof","mcp-protocol-version":"2025-06-18"},body:'{"jsonrpc":"2.0","id":1,"method":"tools/list"}'});
   const response=await handler(req,{params:Promise.resolve({id})});assert.equal(response.status,200);assert.equal(response.headers.get("mcp-session-id"),"test-session");assert.equal(response.headers.get("set-cookie"),null);
   const call=calls.at(-1);assert.equal(call.url,"https://core.example.test"+path);assert.equal(call.options.headers.get("authorization"),"Bearer synthetic");assert.equal(call.options.headers.get("cookie"),null);assert.equal(call.options.headers.get("x-forwarded-user"),null);assert.equal(call.options.redirect,"manual");assert.equal((await response.json()).id,1);
  }
  await scopedGET(new Request("https://web.example.test/mcp/agents/"+id),{params:Promise.resolve({id})});assert.equal(calls.at(-1).options.method,"GET");
 }finally{globalThis.fetch=original;}
});
test("invalid Agent paths and oversized bodies are rejected before contacting Core",async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error("unexpected request");};
 try{
  assert.equal((await proxyMcpRequest(new Request("https://web.example.test/mcp"),"../private")).status,400);
  const req=new Request("https://web.example.test/mcp",{method:"POST",headers:{"content-length":String(9*1024*1024)},body:"x"});
  assert.equal((await proxyMcpRequest(req,id)).status,413);
 }finally{globalThis.fetch=original;}
});
test("network failures return a bounded protocol error without exposing internal host details",async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error("secret upstream address");};
 try {const response=await proxyMcpRequest(new Request("https://web.example.test/mcp",{method:"POST",body:"{}"}),id);assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/secret/);}
 finally{globalThis.fetch=original;}
});


test("null-body upstream statuses and HEAD remain valid downstream responses",async()=>{
 const original=globalThis.fetch;
 try {
  for(const status of [204,205,304]) {
   globalThis.fetch=async()=>new Response(null,{status});
   const response=await scopedGET(new Request("https://web.example.test/mcp/agents/"+id),{params:Promise.resolve({id})});
   assert.equal(response.status,status); assert.equal(await response.text(),"");
  }
  globalThis.fetch=async()=>new Response("unexpected upstream body");
  const head=await proxyMcpRequest(new Request("https://web.example.test/mcp",{method:"HEAD"}));
  assert.equal(head.status,200);assert.equal(await head.text(),"");
 } finally {globalThis.fetch=original;}
});
