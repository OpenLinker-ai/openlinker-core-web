import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";
const sourceRoot = new URL("../src/", import.meta.url);
const mocks = {
  "@/lib/auth": 'export const auth=async()=>globalThis.associationSession===null?null:{jwt:"synthetic",user:{id:"owner"}};',

  "next-auth/react": 'export const useSession=()=>({data:{user:{id:globalThis.associationOwner??"owner"}}});',
  "@/components/ui/dialog": 'import React from "react";export const Dialog=({children})=>children;export const DialogContent=({children})=>React.createElement("div",{role:"dialog"},children);export const DialogHeader=({children})=>children;export const DialogTitle=({children})=>React.createElement("h2",{},children);export const DialogDescription=({children})=>React.createElement("p",{},children);',
  "@/components/skill/skill-picker": 'export const SkillPicker=()=>null;',
  "@/components/playground/browser-stage": 'export const PlaygroundBrowserStage=()=>null;',
  "@/components/playground/detail-panel": 'export const PlaygroundDetailPanel=()=>null;',
  "@/components/playground/run-trace": 'export const RunTrace=()=>null;',
  "@/components/run/run-event-stream": 'export const RunEventStream=()=>null;',
  "@/components/run/browser-final-frame": 'export const BrowserObservationFinalFrameReader=()=>null;',
  "client-only": '',

  "@/hooks/use-api":
    "const fetch=(...a)=>globalThis.resourceTestFetch(...a);export const useApi=()=>({isAuthenticated:globalThis.resourceTestAuthenticated!==false,fetch:globalThis.resourceTestFetchOverride??fetch});",

  "next/navigation":
    'export const notFound=()=>{throw new Error("NOT_FOUND")}; export const redirect=url=>{throw new Error("REDIRECT:"+url)}; export const usePathname=()=>window.location.pathname;export const useSearchParams=()=>new URLSearchParams(window.location.search);export const useRouter=()=>({push:(url)=>{globalThis.resourceTestDestination=url;}});',
  "next/link":
    'import React from "react"; export default function Link(p){return React.createElement("a",p,p.children);}',
  "@/components/auth/auth-link":
    'import React from "react"; export const AuthLink=(p)=>React.createElement("a",p,p.children);',
  "@/lib/api":
    "export const apiFetch=(...a)=>globalThis.resourceTestPublicFetch(...a); export class ApiError extends Error {constructor(status){super();this.status=status;}}; export const localizedErrorMessage=(e,l,f)=>f;",
  "@/lib/i18n-server": 'export const getLocale=async()=>"en";',
  "@/components/layout/topbar": "export const Topbar=()=>null;",
  sonner: "export const toast={success:()=>{},error:()=>{}};",
};
registerHooks({
  resolve(specifier, context, next) {
    if (["./browser-stage", "./detail-panel", "./run-trace"].includes(specifier)) specifier = "@/components/playground/" + specifier.slice(2);
    if (context.parentURL?.startsWith("data:") && specifier === "react")
      return next(specifier, { ...context, parentURL: import.meta.url });
    if (Object.hasOwn(mocks, specifier))
      return {
        url: "data:text/javascript," + encodeURIComponent(mocks[specifier]),
        shortCircuit: true,
      };
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(sourceRoot.href)
    ) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      const found = [path, path + ".ts", path + ".tsx"].find(existsSync);
      if (found) return next(pathToFileURL(found).href, context);
    }
    if (specifier.startsWith("@/")) {
      const p = fileURLToPath(new URL(specifier.slice(2), sourceRoot));
      const found = [p, p + ".ts", p + ".tsx"].find(existsSync);
      assert.ok(found, p);
      return next(pathToFileURL(found).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(sourceRoot.href) && url.endsWith(".json"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default " + readFileSync(new URL(url), "utf8"),
      };
    if (url.startsWith(sourceRoot.href) && /\.tsx?$/.test(url))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    return next(url, context);
  },
});
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://web.example.test/skills",
  pretendToBeVisual: true,
});
for (const key of [
  "window",
  "self",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "MouseEvent",
  "Event",
  "PopStateEvent", "localStorage", "sessionStorage", "requestAnimationFrame", "cancelAnimationFrame",
])
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: dom.window[key],
  });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider, focusManager } = await import("@tanstack/react-query");
const { SkillPackages } = await import("../src/components/skills/skill-packages.tsx");
const { PublicSkillActions } = await import("../src/components/skills/public-skill-actions.tsx");
const { SkillTrialPanel } = await import("../src/components/skills/skill-trial-panel.tsx");
const { PlaygroundRunner } = await import("../src/components/playground/runner.tsx");
const { parseSkillTrial, skillTrialHref, skillTrialReceipt } = await import("../src/lib/skill-association.ts");
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
HTMLElement.prototype.scrollIntoView = () => {};
HTMLElement.prototype.scrollTo = () => {};
const pkg = "00000000-0000-4000-8000-000000000001", vid = "00000000-0000-4000-8000-000000000002", bid = "00000000-0000-4000-8000-000000000003";
const agent = {id:"agent",slug:"test-agent",name:"Test Agent",visibility:"private",creator:{display_name:"Owner"},tags:[],price_per_call_cents:0,description:""};
const version = {id:vid,version:"1.0.0",digest:"a".repeat(64),providers:["claude"],capability_ids:[]};
const item = {id:pkg,name:"Fixture",versions:[{...version,id:"new-version",version:"2.0.0"},version]};
const contents = {name:"Fixture",description:"Synthetic",files:{"SKILL.md":"# Fixture"},required_commands:[]};
const binding = {package_id:pkg,version_id:vid,binding_id:bid,digest:version.digest,version:"1.0.0",name:"Fixture",providers:["claude"],capability_ids:[],latest_version_id:vid,status:"pending",last_run_id:null,error_code:"",loaded_at:null};
const eligible = {supported:true,providers:["claude"],items:[],lifecycle_status:"active",max_bindings:5,host_status:"compatible"};
const run = {run_id:"run-1",status:"running",duration_ms:0,cost_cents:0,replayed:false};
const pageProps = {locale:"en",agents:[agent],skills:[{id:"fixture"}],packageId:pkg,initialVersionId:vid,associate:true};
const button = (host,text) => [...host.querySelectorAll("button")].find(b=>b.textContent===text);
async function settle() { for(let i=0;i<4;i++) await act(async()=>new Promise(resolve=>setTimeout(resolve,0))); }
async function mount(Component, props, check) {
  const host=document.createElement("div"); document.body.append(host);
  const root=createRoot(host); const cache=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const render=async(next)=>{ await act(async()=>root.render(createElement(QueryClientProvider,{client:cache},createElement(Component,next))));await settle(); };
  try {await render(props); await check(host,render,cache);}
  finally {await act(async()=>root.unmount()); cache.clear();host.remove();globalThis.resourceTestFetchOverride=undefined;sessionStorage.clear();localStorage.clear();}
}
function fixtureFetch(data=eligible, writes=[]) {
  return async(path, options={})=>{
    if(options.method){writes.push({path,...options});return {...data,items:[binding]};}
    if(path.endsWith("/skill-packages") && path.includes("/agents/")) return data;
    if(path.endsWith("/versions/"+vid)) return contents;
    if(path.endsWith("/skill-packages/"+pkg)) return item;
    if(path.endsWith("/skill-packages")) return {items:[item]};
    throw new Error("unexpected "+path);
  };
}
async function chooseAgent(host) {
 const select=host.querySelector('[role="dialog"] select');
 await act(async()=>{select.value=agent.id;select.dispatchEvent(new Event("change",{bubbles:true}));}); await settle();
}
test("import and associate preserves returned private version and requires a click",async()=>{
 const calls=[];globalThis.resourceTestFetch=async(path,options)=>{calls.push({path,...options});return {id:pkg,version_id:vid};};
 await mount(PublicSkillActions,{locale:"en",packageId:pkg,version},async host=>{
   assert.equal(calls.length,0);await act(async()=>button(host,"Import and associate").click());
   assert.equal(calls.length,1);assert.equal(calls[0].body.source_version_id,vid);
   assert.equal(globalThis.resourceTestDestination,`/hub/skills/${pkg}?version=${vid}&associate=1`);
 });
});
test("older version opens association without writing and survives token refresh",async()=>{
 const writes=[];globalThis.resourceTestFetch=fixtureFetch(eligible,writes);
 await mount(SkillPackages,pageProps,async(host,render)=>{
   let dialog=host.querySelector('[role="dialog"]');assert.ok(dialog);assert.equal(writes.length,0);
   assert.equal(dialog.querySelectorAll("select")[2].value,vid);await chooseAgent(host);
   globalThis.resourceTestFetchOverride=fixtureFetch(eligible,writes);await render(pageProps);
   assert.equal(dialog.querySelectorAll("select")[0].value,agent.id);assert.equal(dialog.querySelectorAll("select")[2].value,vid);
   await act(async()=>button(dialog,"Associate with Agent").click());await settle();
   assert.equal(writes.length,1);assert.deepEqual(writes[0].body,{version_id:vid});
   dialog=host.querySelector('[role="dialog"]');assert.match(dialog.textContent,/Association saved/);
   const link=dialog.querySelector('a[href^="/playground"]');
   assert.deepEqual(parseSkillTrial(Object.fromEntries(new URL(link.href).searchParams)),{package_id:pkg,version_id:vid,binding_id:bid,digest:version.digest});
 });
});
test("invalid explicit version never substitutes latest or opens binding",async()=>{
 const writes=[];globalThis.resourceTestFetch=fixtureFetch(eligible,writes);
 await mount(SkillPackages,{...pageProps,initialVersionId:"missing"},async host=>{assert.equal(host.querySelector('[role="dialog"]'),null);assert.match(host.textContent,/requested version is unavailable/);assert.equal(writes.length,0);});
});
for(const [label,data,message,disabled] of [
 ["disabled",{...eligible,lifecycle_status:"disabled"},"disabled",true],
 ["no host",{...eligible,supported:false,host_status:"none"},"Connect a compatible",true],
 ["incompatible host",{...eligible,supported:false,host_status:"incompatible"},"does not support",true],
 ["provider mismatch",{...eligible,providers:["codex"]},"incompatible",true],
 ["full",{...eligible,items:Array.from({length:5},(_,i)=>({...binding,package_id:"other"+i}))},"slots",true],
 ["update at capacity",{...eligible,items:[binding,...Array.from({length:4},(_,i)=>({...binding,package_id:"other"+i}))]},"passed",false],
]) test("association checks "+label,async()=>{
 globalThis.resourceTestFetch=fixtureFetch(data);
 await mount(SkillPackages,pageProps,async host=>{
  await chooseAgent(host);const dialog=host.querySelector('[role="dialog"]');
  assert.match(dialog.textContent,new RegExp(message,"i"));assert.equal(button(dialog,"Associate with Agent").disabled,disabled);
 });
});
test("same-version save reports current version without claiming fresh loading",async()=>{
 globalThis.resourceTestFetch=fixtureFetch({...eligible,items:[{...binding,status:"loaded",last_run_id:"old-run"}]});
 await mount(SkillPackages,pageProps,async host=>{
  await chooseAgent(host);await act(async()=>button(host.querySelector('[role="dialog"]'),"Associate with Agent").click());await settle();
  const dialog=host.querySelector('[role="dialog"]');assert.match(dialog.textContent,/Already the current version/);assert.doesNotMatch(dialog.textContent,/This run loaded/);
 });
});
test("trial only accepts exact run, version, generation and digest",()=>{
 const loaded={...binding,status:"loaded",last_run_id:run.run_id};const data={...eligible,items:[loaded]};
 assert.equal(skillTrialReceipt(data,binding,run.run_id),"loaded");
 for(const field of ["binding_id","version_id","digest"])assert.equal(skillTrialReceipt({...data,items:[{...loaded,[field]:"different"}]},binding,run.run_id),"changed");
 assert.equal(skillTrialReceipt(data,binding,"other-run"),"otherRun");assert.equal(skillTrialReceipt(eligible,binding,run.run_id),"removed");
 const query=Object.fromEntries(new URL(skillTrialHref("a/b",binding),"https://test").searchParams);
 assert.deepEqual(parseSkillTrial(query),{package_id:pkg,version_id:vid,binding_id:bid,digest:version.digest});
 assert.equal(parseSkillTrial({...query,skill_binding:[bid,bid]}),undefined);assert.equal(parseSkillTrial({...query,skill_digest:"bad"}),undefined);
});
test("trial separates loading and failed Run; owner denial does not retry",async()=>{
 globalThis.resourceTestFetch=async()=>({...eligible,items:[{...binding,status:"loaded",last_run_id:run.run_id}]});
 await mount(SkillTrialPanel,{agentId:agent.id,renderedUserId:"owner",expected:binding,run:{...run,status:"failed"},startedAt:Date.now(),locale:"en"},async host=>{assert.match(host.textContent,/loaded the selected fixed version/);assert.match(host.textContent,/Run failed/);});
 let reads=0;globalThis.resourceTestFetch=async()=>{reads++;throw Object.assign(new Error(),{status:404});};
 await mount(SkillTrialPanel,{agentId:agent.id,renderedUserId:"owner",expected:binding,run,startedAt:Date.now(),locale:"en"},async host=>{assert.match(host.textContent,/Only the Agent owner/);assert.equal(button(host,"Refresh receipt"),undefined);assert.equal(reads,1);});
});
test("failed association preserves exact choices; selection is locked during submission",async()=>{
 let rejectWrite;let writes=0;globalThis.resourceTestFetch=async(path,options={})=>{
   if(options.method){writes++;return new Promise((_,reject)=>{rejectWrite=reject;});}
   return fixtureFetch()(path,options);
 };
 await mount(SkillPackages,pageProps,async host=>{
   await chooseAgent(host);const dialog=host.querySelector('[role="dialog"]');
   await act(async()=>button(dialog,"Associate with Agent").click());
   assert.ok([...dialog.querySelectorAll("select")].every(select=>select.disabled));assert.equal(writes,1);
   await act(async()=>rejectWrite(new Error("network")));await settle();
   assert.equal(dialog.querySelectorAll("select")[0].value,agent.id);assert.equal(dialog.querySelectorAll("select")[2].value,vid);
   assert.match(dialog.textContent,/association|associate/i);assert.equal(button(dialog,"Associate with Agent").disabled,false);
 });
});
test("trial timer is bounded, pauses in background, refreshes terminal once and aborts on unmount",async(t)=>{
 // Keep the React scheduler real; replace the browser timers used by React Query.
 const timers=new Map();let id=0;let now=1000;const original={setTimeout,clearTimeout,setInterval,clearInterval,now:Date.now};
 const schedule=(fn,delay,repeat)=>{const n=++id;timers.set(n,{fn,at:now+delay,delay,repeat});return n;};
 globalThis.setTimeout=(fn,delay=0)=>schedule(fn,delay,false);globalThis.clearTimeout=n=>timers.delete(n);
 globalThis.setInterval=(fn,delay)=>schedule(fn,delay,true);globalThis.clearInterval=n=>timers.delete(n);Date.now=()=>now;
 const flush=async()=>{for(let i=0;i<8;i++){await act(async()=>{await Promise.resolve();for(const [key,timer] of [...timers])if(timer.at<=now){if(timer.repeat)timer.at=now+timer.delay;else timers.delete(key);timer.fn();}});}};
 const advance=async(ms)=>{now+=ms;await flush();};
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);const cache=new QueryClient({defaultOptions:{queries:{gcTime:0}}});
 let reads=0;let signal;let pending=false;
 globalThis.resourceTestFetch=async(path,options)=>{reads++;signal=options.signal;if(pending)return new Promise(()=>{});return {...eligible,items:[binding]};};
 const props={agentId:agent.id,renderedUserId:"owner",expected:binding,run,startedAt:now,locale:"en"};
 const render=async(p)=>{await act(async()=>root.render(createElement(QueryClientProvider,{client:cache},createElement(SkillTrialPanel,p))));await flush();};
 try {
  await render({...props,run:undefined});assert.equal(reads,1);await advance(3600000);assert.equal(reads,1,"idle has no polling");
  props.startedAt=now;await render(props);assert.equal(reads,2);await advance(5000);assert.equal(reads,3);
  focusManager.setFocused(false);await advance(10000);assert.equal(reads,3,"background pauses reads");focusManager.setFocused(true);
  globalThis.resourceTestFetchOverride=(...args)=>globalThis.resourceTestFetch(...args);await render(props);
  await advance(105000);const atDeadline=reads;await advance(60000);assert.equal(reads,atDeadline);assert.match(host.textContent,/Automatic observation ended/);
  await act(async()=>button(host,"Refresh receipt").click());await flush();assert.equal(reads,atDeadline+1);await advance(60000);assert.equal(reads,atDeadline+1,"manual refresh cannot extend deadline");
  await render({...props,run:{...run,status:"success"}});const terminalReads=reads;assert.equal(terminalReads,atDeadline+2);await advance(60000);assert.equal(reads,terminalReads);assert.match(host.textContent,/run ended/i);
  pending=true;await act(async()=>button(host,"Refresh receipt").click());await flush();assert.equal(signal.aborted,false);
  await act(async()=>root.unmount());assert.equal(signal.aborted,true);
 } finally {
  cache.clear();host.remove();focusManager.setFocused(undefined);globalThis.resourceTestFetchOverride=undefined;
  Object.assign(globalThis,{setTimeout:original.setTimeout,clearTimeout:original.clearTimeout,setInterval:original.setInterval,clearInterval:original.clearInterval});Date.now=original.now;
 }
});
test("both production runners disable autorun for trial and verify only an explicit new submission",async()=>{
 const writes=[];globalThis.resourceTestFetch=async(path,options={})=>{
  if(options.method){writes.push({path,...options});return {...run,status:"failed"};}
  return {...eligible,items:[{...binding,status:"loaded",last_run_id:run.run_id}]};
 };
 await mount(PlaygroundRunner,{agent,userId:"owner",prefill:"Review this fixture",skillTrial:binding,autorun:true,locale:"en"},async host=>{
  assert.equal(writes.length,0,"a trial URL cannot execute automatically");assert.match(host.textContent,/Enter a task below/);
  const send=button(host,"Send");assert.ok(send);await act(async()=>send.click());await settle();
  assert.equal(writes.length,1);assert.equal(writes[0].path,"/api/v1/runs");assert.ok(writes[0].headers["Idempotency-Key"]);
  assert.match(host.textContent,/This run loaded the selected fixed version/);assert.match(host.textContent,/Run failed/);
  await act(async()=>button(host,"New chat").click());await settle();assert.match(host.textContent,/Enter a task below/);assert.doesNotMatch(host.textContent,/could not be submitted/);
 });
});
test("route cannot autorun on malformed trial context; Hosted task route excludes verification",async()=>{
 const {default:Page}=await import("../src/app/(user)/playground/[slug]/page.tsx");
 globalThis.resourceTestPublicFetch=async()=>({...agent,readiness:{callable:true}});
 function findRunner(tree){if(!tree||typeof tree!=="object")return; if(tree.type===PlaygroundRunner)return tree;for(const child of [tree.props?.children].flat(Infinity)){const found=findRunner(child);if(found)return found;}}
 const query=Object.fromEntries(new URL(skillTrialHref(agent.slug,binding),"https://test").searchParams);
 const page=await Page({params:Promise.resolve({slug:agent.slug}),searchParams:Promise.resolve({...query,autorun:"1"})});
 assert.deepEqual(findRunner(page).props.skillTrial,parseSkillTrial(query));assert.equal(findRunner(page).props.autorun,false);
 const malformed=await Page({params:Promise.resolve({slug:agent.slug}),searchParams:Promise.resolve({skill_binding:"bad",autorun:"1"})});
 assert.equal(findRunner(malformed).props.skillTrial,undefined);assert.equal(findRunner(malformed).props.autorun,false);
 const withTask=await Page({params:Promise.resolve({slug:agent.slug}),searchParams:Promise.resolve({...query,task_id:"task-fixture",autorun:"1"})});
 const props=findRunner(withTask).props;if("taskId" in props)assert.equal(props.skillTrial,undefined);assert.equal(props.autorun,false);
 globalThis.associationSession=null;
 try {await assert.rejects(()=>Page({params:Promise.resolve({slug:agent.slug}),searchParams:Promise.resolve(query)}),error=>{assert.match(error.message,/REDIRECT:/);assert.ok(error.message.includes("skill_version"));return true;});}
 finally {globalThis.associationSession=undefined;}
});
test("late old Run response cannot overwrite current trial; identity change hides old evidence",async()=>{
 let release;globalThis.resourceTestFetch=async()=>new Promise(resolve=>{release=resolve;});
 const props={agentId:agent.id,renderedUserId:"owner",expected:binding,run:{...run,status:"success"},startedAt:Date.now(),locale:"en"};
 await mount(SkillTrialPanel,props,async(host,render)=>{
  const releaseOld=release;globalThis.resourceTestFetch=async()=>({...eligible,items:[{...binding,status:"failed",last_run_id:"run-2"}]});
  await render({...props,run:{...run,run_id:"run-2",status:"failed"}});
  await act(async()=>releaseOld({...eligible,items:[{...binding,status:"loaded",last_run_id:run.run_id}]}));await settle();
  assert.match(host.textContent,/could not load the skill/);assert.doesNotMatch(host.textContent,/loaded the selected/);
  globalThis.associationOwner="someone-else";await render(props);assert.match(host.textContent,/Only the Agent owner/);assert.doesNotMatch(host.textContent,/loaded the selected/);
 });globalThis.associationOwner=undefined;
});

test("previous Run receipt is waiting while active, inconclusive only after completion",async()=>{
 globalThis.resourceTestFetch=async()=>({...eligible,items:[{...binding,status:"loaded",last_run_id:"previous-run"}]});
 const props={agentId:agent.id,renderedUserId:"owner",expected:binding,run,startedAt:Date.now(),locale:"en"};
 await mount(SkillTrialPanel,props,async(host,render)=>{
  assert.match(host.textContent,/No matching load receipt/);assert.doesNotMatch(host.textContent,/cannot be confirmed/);
  await render({...props,run:{...run,status:"success"}});assert.match(host.textContent,/cannot be confirmed/);
 });
});
