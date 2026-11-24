import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { frontmatter, validate } from './validate-plugins.mjs';

// Construit un dépôt minimal : un plugin « demo » avec un agent « alpha » et un skill « beta ».
function repo({ version = '1.0.0', marketVersion = '1.0.0', announced = '1 skills (beta) et 1 agents (alpha)', agentName = 'alpha' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'plugins-'));
  const plugin = join(root, 'plugins/demo');
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  mkdirSync(join(plugin, '.claude-plugin'), { recursive: true });
  mkdirSync(join(plugin, 'agents'), { recursive: true });
  mkdirSync(join(plugin, 'skills/beta'), { recursive: true });
  writeFileSync(join(root, '.claude-plugin/marketplace.json'), JSON.stringify({
    plugins: [{ name: 'demo', source: './plugins/demo', description: announced, version: marketVersion }],
  }));
  writeFileSync(join(plugin, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'demo', version, description: announced }));
  writeFileSync(join(plugin, 'agents/alpha.md'), `---\nname: ${agentName}\ndescription: test\ntools: Read\n---\ncorps\n`);
  writeFileSync(join(plugin, 'skills/beta/SKILL.md'), '---\nname: "beta"\ndescription: test\n---\ncorps\n');
  return root;
}

test('un dépôt cohérent ne produit aucune erreur', () => {
  assert.deepEqual(validate(repo()), []);
});

test('versions différentes entre plugin.json et marketplace.json', () => {
  const errors = validate(repo({ marketVersion: '1.0.1' }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /version 1\.0\.0 dans plugin\.json, 1\.0\.1 dans marketplace\.json/);
});

test('un agent absent de la liste annoncée est signalé', () => {
  const errors = validate(repo({ announced: '1 skills (beta) et 2 agents (alpha, security-fixer)' }));
  assert.ok(errors.some((e) => e.includes('annonce 2 agents')));
  assert.ok(errors.some((e) => e.includes('en trop : security-fixer')));
});

test('le nom de l\'agent doit suivre le nom du fichier', () => {
  const errors = validate(repo({ agentName: 'autre' }));
  assert.ok(errors.some((e) => e.includes('différent du fichier')));
});

test('frontmatter lit les valeurs entre guillemets et ignore le corps', () => {
  assert.deepEqual(frontmatter('---\nname: "x"\ndescription: >\n  suite\n---\nname: faux\n'), { name: 'x', description: '>' });
  assert.equal(frontmatter('pas d\'en-tête'), null);
});
