#!/usr/bin/env bun
// Procedural Lords-of-Xulima-style sprite generator.
// Writes one PNG per recipe into ../public/sprites/.
// Recipes are assembled from ./sprite/{buildings,characters,props}.ts; this
// file only knows how to iterate them and write the output.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Canvas } from './sprite/canvas';
import { encodePng } from './sprite/png';
import { buildRecipes } from './sprite/recipes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = join(__dirname, '..', 'public', 'sprites');
await mkdir(outDir, { recursive: true });

const recipes = buildRecipes();
let count = 0;
for (const [key, recipe] of Object.entries(recipes)) {
    const c = new Canvas(recipe.w, recipe.h);
    recipe.draw(c);
    const png = encodePng(c.w, c.h, c.buf);
    await writeFile(join(outDir, `${key}.png`), png);
    count++;
    console.log(`wrote ${key}.png ${c.w}x${c.h} (${png.length}b)`);
}
console.log(`\n${count} sprites written to ${outDir}`);
