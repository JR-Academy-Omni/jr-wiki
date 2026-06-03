#!/usr/bin/env node
// Guard against volatile content in pipeline-generated files.
//
// Root cause of repeated cross-PR conflicts (see commit 61ef23a): the build
// markers used to embed `new Date().toISOString()`, so every `bun run build`
// rewrote 400+ files with a fresh timestamp. Any two branches that both ran
// build then conflicted on every generated file.
//
// The timestamp is gone from build/pipelines/_shared.ts, but nothing stops a
// future edit from reintroducing it. This check fails the build if any
// committed generated file carries a volatile marker, so the regression is
// caught in CI instead of in a 400-file PR diff.

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..', 'src');
// `由 build/pipelines/<name>.pipeline.ts 自动生成` followed by ` · <ISO timestamp>`
const VOLATILE_MARKER = /自动生成\s*·\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const offenders = [];

function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full);
		} else if (/\.(md|html|css|js|ts)$/.test(entry)) {
			const text = readFileSync(full, 'utf8');
			if (VOLATILE_MARKER.test(text)) offenders.push(full);
		}
	}
}

walk(ROOT);

if (offenders.length > 0) {
	console.error(
		`\n✗ ${offenders.length} generated file(s) contain a volatile timestamp marker.\n` +
		`  Generated markers must be deterministic (no '· <timestamp>').\n` +
		`  This is the root cause of cross-PR conflicts — see build/pipelines/_shared.ts.\n` +
		`  Fix: keep the marker as '… 自动生成' with no date, then re-run the pipeline.\n\n` +
		offenders.slice(0, 20).map((f) => `    ${f}`).join('\n') +
		(offenders.length > 20 ? `\n    … and ${offenders.length - 20} more` : '') +
		'\n',
	);
	process.exit(1);
}

console.log('✓ no volatile timestamps in generated files');
