import assert from 'node:assert/strict';
import test from 'node:test';
import {skillInstallCommand, skillInstallSource, skillCommandOrigin, skillPlatformCommands} from '../src/lib/skill-install.mjs';
const packageId='00000000-0000-4000-8000-000000000001',versionId='00000000-0000-4000-8000-000000000002';
const opts={origin:'https://web.example.test',packageId,versionId};
const upstream={repositoryUrl:'https://github.com/wshobson/agents/tree/main/plugins/ui-design/skills/accessibility-compliance',name:'accessibility-compliance',compatible:true};
test('upstream command goes directly to the declared repository and names the selected skill',()=>{
 const expected='npx skills add https://github.com/wshobson/agents --skill accessibility-compliance';
 assert.equal(skillInstallCommand(upstream),expected);
 assert.deepEqual(skillInstallSource(upstream),{repository:'https://github.com/wshobson/agents',directory:'plugins/ui-design/skills/accessibility-compliance',url:upstream.repositoryUrl});
 for(const repositoryUrl of [upstream.repositoryUrl+'/',upstream.repositoryUrl.replace('/tree/main/','/blob/46891e7e60da0e52baf1050b7b6391b64e84c6d9/')+'/SKILL.md',upstream.repositoryUrl.replace('/agents/','/agents.git/')]) assert.equal(skillInstallCommand({...upstream,repositoryUrl}),expected);
 assert.doesNotMatch(expected,/archive|openlinker|--agent|--copy|@1\.7| -g| -y/);
});
test('source recognition rejects ambiguous repositories, unsafe tokens and mismatched versions',()=>{
 const invalid=['','https://github.com/wshobson/agents','https://github.com/wshobson/agents/tree/main','https://gist.github.com/wshobson/agents','https://evil.test/wshobson/agents/tree/main/skills/accessibility-compliance','https://www.github.com/wshobson/agents/tree/main/skills/accessibility-compliance',upstream.repositoryUrl+'?x=1',upstream.repositoryUrl+'#x',upstream.repositoryUrl.replace('github.com','user:secret@github.com'),upstream.repositoryUrl.replace('github.com','github.com:443'),upstream.repositoryUrl.replace('skills/','../'),upstream.repositoryUrl.replace('/main/','/%2F/'),upstream.repositoryUrl+';bad',upstream.repositoryUrl+'$(bad)',upstream.repositoryUrl+'`bad`',upstream.repositoryUrl+'\n',upstream.repositoryUrl.replace('/tree/','/blob/'),upstream.repositoryUrl.replace('/agents/','/../'),upstream.repositoryUrl.replace('/main/','/./')];
 for(const repositoryUrl of invalid){assert.equal(skillInstallCommand({...upstream,repositoryUrl}),'',repositoryUrl);assert.equal(skillInstallSource({...upstream,repositoryUrl}),null,repositoryUrl);}
 for(const name of ['different-skill','-option','bad;name','bad name','a'.repeat(65),'Bad_Name'])assert.equal(skillInstallCommand({...upstream,name}),'',name);
 assert.equal(skillInstallCommand({...upstream,compatible:false}),'');
});
test('origin whitelist prevents shell fragments and credentials in generated commands',()=>{
 for(const origin of ['', 'https://user:secret@example.test','https://example.test/a','https://example.test?q=x','https://example.test#x','http://example.test','https://x;bad','https://x"bad','https://x`bad','https://x$(bad)','https://x%24bad','https://-x.test','https://x.test:0','https://x.test:99999','https://x.test\n','https://x test']){
  assert.equal(skillCommandOrigin(origin),'',origin);assert.equal(skillPlatformCommands({...opts,origin,digest:'a'.repeat(64)}),null,origin);
 }
 assert.equal(skillCommandOrigin('http://127.0.0.1:3000'),'http://127.0.0.1:3000');
 assert.equal(skillCommandOrigin('https://example.test:443'),'https://example.test');
});
test('platform commands pin UUID and canonical digest independently of ZIP',()=>{
 const commands=skillPlatformCommands({...opts,digest:'a'.repeat(64)});
 assert.match(commands.download,/skills download .*--digest a{64} --output skill-bundle.json$/);
 assert.match(commands.import,/skills import .*--digest a{64}$/);
 assert.match(commands.login,/auth login --scopes skill-packages:read,skill-packages:import,skill-bindings:read,skill-bindings:manage$/);
 assert.equal(skillPlatformCommands({...opts,digest:'";bad'}),null);
});
