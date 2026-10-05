import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {registerHooks} from "node:module";
import {fileURLToPath,pathToFileURL} from "node:url";
import test from "node:test";
import {JSDOM} from "jsdom";
import ts from "typescript";
const sourceRoot=new URL("../src/",import.meta.url);
const mocks={
 "@/hooks/use-api":'export const useApi=()=>({isAuthenticated:true,fetch:(...a)=>globalThis.resourceTestFetch(...a)});',
 "@tanstack/react-query":'export const useQueryClient=()=>({invalidateQueries:async()=>{}});',
 "next/navigation":'export const usePathname=()=>window.location.pathname;export const useSearchParams=()=>new URLSearchParams(window.location.search);export const useRouter=()=>({push:(url)=>{globalThis.resourceTestDestination=url;}});',
 "next/link":'import React from "react"; export default function Link(p){return React.createElement("a",p,p.children);}',
 "@/components/auth/auth-link":'import React from "react"; export const AuthLink=(p)=>React.createElement("a",p,p.children);',
 "sonner":'export const toast={success:()=>{}};'
};
registerHooks({
 resolve(specifier,context,next){
  if(context.parentURL?.startsWith("data:") && specifier === "react") return next(specifier,{...context,parentURL:import.meta.url});
  if(Object.hasOwn(mocks,specifier))return {url:"data:text/javascript,"+encodeURIComponent(mocks[specifier]),shortCircuit:true};
  if(specifier.startsWith(".") && context.parentURL?.startsWith(sourceRoot.href)){const path=fileURLToPath(new URL(specifier,context.parentURL));const found=[path,path+".ts",path+".tsx"].find(existsSync);if(found)return next(pathToFileURL(found).href,context);}
  if(specifier.startsWith("@/")){const p=fileURLToPath(new URL(specifier.slice(2),sourceRoot));const found=[p,p+".ts",p+".tsx"].find(existsSync);assert.ok(found,p);return next(pathToFileURL(found).href,context);}return next(specifier,context);
 },
 load(url,context,next){if(url.startsWith(sourceRoot.href)&&/\.tsx?$/.test(url))return {format:"module",shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context);}
});
const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://web.example.test/skills",pretendToBeVisual:true});
for(const key of ["window","self","document","navigator","HTMLElement","Element","MouseEvent","Event","PopStateEvent"])Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {act,createElement}=await import("react");
const {createRoot}=await import("react-dom/client");
const {SkillPublicationControls,PublicSkillActions}=await import("../src/components/skills/public-skill-actions.tsx");
const {PublicSkillFiles}=await import("../src/components/skills/public-skill-files.tsx");
const {RouteTransitionFeedback}=await import("../src/components/layout/route-transition-feedback.tsx");
const {CopyContent}=await import("../src/components/resources/copy-content.tsx");
const item={id:"00000000-0000-4000-8000-000000000001",visibility:"private",name:"fixture",versions:[]};
const version={id:"00000000-0000-4000-8000-000000000002",version:"1.0.0",digest:"a".repeat(64),providers:["claude"],capability_ids:[]};
const contents={name:"fixture",description:"Synthetic content",files:{"SKILL.md":"# Instructions","notes.txt":"notes"},required_commands:[]};
async function mount(component,props,check){
 const container=document.createElement("div");document.body.append(container);const root=createRoot(container);
 try {await act(async()=>root.render(createElement(component,props)));await check(container);}
 finally {await act(async()=>root.unmount());container.remove();}
}
test("publishing uses the reviewed selected version and cannot silently publish on page load",async()=>{
 const calls=[];globalThis.resourceTestFetch=async(path,options)=>{calls.push({path,...options});return {};};
 await mount(SkillPublicationControls,{item,version,contents,locale:"en"},async container=>{
  assert.equal(calls.length,0);const publish=[...container.querySelectorAll("button")].find(b=>b.textContent==="Publish selected version");assert.equal(publish.disabled,true);
  await act(async()=>container.querySelector('input[type="checkbox"]').click());assert.equal(publish.disabled,false);
  await act(async()=>publish.click());assert.deepEqual(calls,[{path:`/api/v1/creator/skill-packages/${item.id}/versions/${version.id}/publication`,method:"PUT",body:{}}]);
  assert.equal(container.querySelector('input[type="checkbox"]').checked,false);
 });
});
test("public detail imports a digest-pinned private copy and returns to its management page",async()=>{
 const calls=[];globalThis.resourceTestFetch=async(path,options)=>{calls.push({path,...options});return {id:"new-private-copy"};};
 await mount(PublicSkillActions,{packageId:item.id,version,locale:"en"},async container=>{
  const button=[...container.querySelectorAll("button")].find(b=>b.textContent==="Import to my packages");await act(async()=>button.click());
  assert.deepEqual(calls[0],{path:"/api/v1/creator/skill-packages/imports",method:"POST",body:{source_package_id:item.id,source_version_id:version.id,expected_digest:version.digest}});
  assert.equal(globalThis.resourceTestDestination,"/hub/skills/new-private-copy");
 });
});
test("untrusted skill Markdown stays inert and is nested under the detail heading",async()=>{
 await mount(PublicSkillFiles,{locale:"en",files:{"SKILL.md":"---\nname: demo\n---\n# Document heading\n<script>window.secret=true</script>\n![remote](https://example.test/tracker.png)\n[bad](javascript:alert(1))"}},async container=>{
  assert.equal(container.querySelectorAll("script,img,h1").length,0);assert.equal(container.querySelector("h3")?.textContent,"Document heading");assert.equal(container.querySelector('a[href^="javascript:"]'),null);
 });
});
test("copy failure exposes a manual fallback even for compact link controls",async()=>{
 Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw new Error("denied");}}});
 await mount(CopyContent,{locale:"en",label:"Copy link",value:"https://example.test/fixed",compact:true},async container=>{
  assert.equal(container.querySelector("pre"),null);await act(async()=>container.querySelector("button").click());assert.match(container.textContent,/Copy failed/);assert.equal(container.querySelector("pre").textContent,"https://example.test/fixed");
 });
});


test("in-page use/configuration anchors do not leave global navigation feedback spinning",async()=>{
 await mount(RouteTransitionFeedback,{locale:"en"},async container=>{
  await act(async()=>{
   window.history.pushState(null,"","#mcp-connection");
   window.dispatchEvent(new PopStateEvent("popstate"));
   await new Promise(resolve=>setTimeout(resolve,180));
  });
  assert.equal(container.querySelector('[role="status"]'),null);
 });
});

test("skill downloads do not trigger global navigation feedback",async()=>{
 await mount(RouteTransitionFeedback,{locale:"en"},async feedback=>{
  await mount(PublicSkillActions,{packageId:item.id,version,locale:"en"},async container=>{
   const links=[...container.querySelectorAll("a[download]")];assert.equal(links.length,2);
   assert.ok(links.some(a=>a.href.endsWith("/archive.zip")));assert.ok(links.some(a=>a.href.endsWith("/bundle.json")));
   for(const link of links) {
    // Prevent JSDOM navigation after the production click listener runs.
    document.addEventListener("click",event=>event.preventDefault(),{once:true});
    await act(async()=>{link.click();await new Promise(resolve=>setTimeout(resolve,180));});
    assert.equal(feedback.querySelector('[role="status"]'),null);
   }
  });
 });
});
