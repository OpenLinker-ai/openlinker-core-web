import assert from 'node:assert/strict';
import test from 'node:test';
import {skillInstallCommand, skillInstallClients, skillCommandOrigin, skillPlatformCommands} from '../src/lib/skill-install.mjs';
const packageId='00000000-0000-4000-8000-000000000001',versionId='00000000-0000-4000-8000-000000000002';
const opts={origin:'https://web.example.test',packageId,versionId,providers:['claude','codex'],compatible:true,client:'claude-code',scope:'project'};
test('fixed install commands use verified provider/scope options only',()=>{
 assert.deepEqual(skillInstallClients(['codex','claude','other']),['claude-code','codex']);
 assert.equal(skillInstallCommand(opts),`npx skills@1.7.1 add "https://web.example.test/api/v1/skill-packages/${packageId}/versions/${versionId}/archive.zip" --agent claude-code --copy`);
 assert.match(skillInstallCommand({...opts,client:'codex',scope:'global'}),/--agent codex --copy -g$/);
 for(const patch of [{compatible:false},{client:'cursor'},{providers:['codex']},{scope:'; bad'},{packageId:'../escape'},{versionId:'$(bad)'},{packageId:'00000000-0000-0000-0000-000000000000'}])assert.equal(skillInstallCommand({...opts,...patch}),'');
});
test('origin whitelist prevents shell fragments and credentials in generated commands',()=>{
 for(const origin of ['', 'https://user:secret@example.test','https://example.test/a','https://example.test?q=x','https://example.test#x','http://example.test','https://x;bad','https://x"bad','https://x`bad','https://x$(bad)','https://x%24bad','https://-x.test','https://x.test:0','https://x.test:99999','https://x.test\n','https://x test']){
  assert.equal(skillCommandOrigin(origin),'',origin);assert.equal(skillInstallCommand({...opts,origin}),'',origin);assert.equal(skillPlatformCommands({...opts,origin,digest:'a'.repeat(64)}),null,origin);
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
