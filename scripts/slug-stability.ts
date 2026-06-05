/**
 * Slug stability registry — locks published slugs to prevent accidental URL breakage.
 *
 * Slugs in jr-wiki are derived from filenames (and folder names for books).
 * Renaming a published file = changing its URL = 404 for any external link
 * pointing to the old URL = SEO penalty (see feedback_url_stability).
 *
 * This module powers two npm scripts:
 *   bun run lock-slugs   — regenerate slug-registry.json from current files
 *   bun run check-slugs  — fail if any registered slug went missing (CI gate)
 *
 * The registry covers 4 content types (matches sync-to-db.ts):
 *   - books      → folder name → /wiki/{slug}
 *   - chapters   → filename inside book folder → /wiki/{book}/section/...
 *   - articles   → filename → /blog/{slug}
 *   - stories    → filename → testimonial id (rendered on home)
 *
 * Help files are not synced to DB so they're not registered.
 */

import {
	existsSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync
} from 'fs';
import { join } from 'path';

const SRC = join(import.meta.dir, '..', 'src', 'content');
const REGISTRY_PATH = join(import.meta.dir, '..', 'slug-registry.json');

export interface SlugEntry {
	type: 'book' | 'chapter' | 'article' | 'story';
	slug: string;
	/** for chapters only — the parent book slug */
	book?: string;
}

export interface Registry {
	/** ISO timestamp of last lock */
	lockedAt: string;
	/** Schema version for forward compatibility */
	version: 1;
	slugs: SlugEntry[];
}

const KEY = (e: SlugEntry): string =>
	e.type === 'chapter' ? `chapter:${e.book}/${e.slug}` : `${e.type}:${e.slug}`;

function listMd(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith('.md'))
		.map((f) => f.replace('.md', ''))
		.sort();
}

function listFolders(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => statSync(join(dir, f)).isDirectory())
		.sort();
}

export function scanCurrentSlugs(): SlugEntry[] {
	const slugs: SlugEntry[] = [];

	// Books + chapters
	const booksDir = join(SRC, 'wiki');
	for (const book of listFolders(booksDir)) {
		const metaPath = join(booksDir, book, '_meta.yaml');
		if (!existsSync(metaPath)) continue;
		slugs.push({ type: 'book', slug: book });
		for (const chapter of listMd(join(booksDir, book))) {
			slugs.push({ type: 'chapter', book, slug: chapter });
		}
	}

	// Articles
	for (const article of listMd(join(SRC, 'articles'))) {
		slugs.push({ type: 'article', slug: article });
	}

	// Stories
	for (const story of listMd(join(SRC, 'stories'))) {
		slugs.push({ type: 'story', slug: story });
	}

	return slugs;
}

export function readRegistry(): Registry | null {
	if (!existsSync(REGISTRY_PATH)) return null;
	return JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
}

export function writeRegistry(slugs: SlugEntry[]): void {
	const sortedSlugs = slugs.slice().sort((a, b) => KEY(a).localeCompare(KEY(b)));
	const previous = readRegistry();
	const slugsUnchanged =
		previous != null &&
		previous.slugs.length === sortedSlugs.length &&
		previous.slugs.every((p, i) => KEY(p) === KEY(sortedSlugs[i]));
	const reg: Registry = {
		lockedAt: slugsUnchanged && previous ? previous.lockedAt : new Date().toISOString(),
		version: 1,
		slugs: sortedSlugs
	};
	writeFileSync(REGISTRY_PATH, `${JSON.stringify(reg, null, 2)}\n`);
}

export function diff(
	registered: SlugEntry[],
	current: SlugEntry[]
): { missing: SlugEntry[]; added: SlugEntry[] } {
	const regSet = new Set(registered.map(KEY));
	const curSet = new Set(current.map(KEY));
	return {
		missing: registered.filter((e) => !curSet.has(KEY(e))),
		added: current.filter((e) => !regSet.has(KEY(e)))
	};
}

// CLI entry — pick command from argv[2]
const cmd = process.argv[2];

if (cmd === 'lock') {
	const slugs = scanCurrentSlugs();
	writeRegistry(slugs);
	const counts = slugs.reduce<Record<string, number>>((acc, s) => {
		acc[s.type] = (acc[s.type] || 0) + 1;
		return acc;
	}, {});
	console.log(`✓ slug-registry.json updated (${slugs.length} slugs)`);
	console.log(
		`  books ${counts.book || 0} | chapters ${counts.chapter || 0} | articles ${
			counts.article || 0
		} | stories ${counts.story || 0}`
	);
} else if (cmd === 'check') {
	const reg = readRegistry();
	const current = scanCurrentSlugs();

	if (!reg) {
		console.log(
			'⚠ slug-registry.json not found. Run `bun run lock-slugs` to create it.'
		);
		process.exit(0);
	}

	const { missing, added } = diff(reg.slugs, current);

	if (missing.length === 0 && added.length === 0) {
		console.log(`✓ slug stability check passed (${current.length} slugs match registry)`);
		process.exit(0);
	}

	if (missing.length > 0) {
		console.error(
			`\n❌ ${missing.length} registered slug(s) MISSING — file rename or delete detected.`
		);
		console.error(
			'   Renaming/deleting published slugs breaks URLs (404 + SEO penalty).'
		);
		console.error('   Restore the file, or — if intentional — add a redirect FIRST then run');
		console.error('   `bun run lock-slugs` only after the redirect is verified live.');
		console.error('');
		for (const m of missing) {
			console.error(
				`   • ${m.type}: ${m.book ? `${m.book}/` : ''}${m.slug}`
			);
		}
	}

	if (added.length > 0) {
		console.log(`\nℹ ${added.length} new slug(s) detected — run \`bun run lock-slugs\` to register:`);
		for (const a of added) {
			console.log(`   • ${a.type}: ${a.book ? `${a.book}/` : ''}${a.slug}`);
		}
	}

	process.exit(missing.length > 0 ? 1 : 0);
} else {
	console.error('Usage:');
	console.error('  bun run scripts/slug-stability.ts lock   # regenerate slug-registry.json');
	console.error('  bun run scripts/slug-stability.ts check  # CI gate (fails if any slug missing)');
	process.exit(2);
}
