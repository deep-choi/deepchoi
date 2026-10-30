import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriesForPlacement, categoryIn, isListedIn, placementSummary, primaryPlacementOf, toggleEditorPlacement } from './entryPlacement.ts';

const categories = [
    { name: 'UI / UX', type: 'work' as const, section: null },
    { name: '개발기', type: 'blog' as const, section: null },
    { name: 'OpenAI', type: 'blog' as const, section: 'news' as const },
    { name: '이슈', type: 'blog' as const, section: 'news' as const },
];

test('News offers only news categories; Blog excludes them', () => {
    assert.deepEqual(categoriesForPlacement(categories, 'news').map(c => c.name), ['OpenAI', '이슈']);
    assert.deepEqual(categoriesForPlacement(categories, 'blog').map(c => c.name), ['개발기']);
});

test('switching Blog to News persists the existing blog type and a news category', () => {
    const result = toggleEditorPlacement({ type: 'blog', category: '개발기', title: '초안', content: '<p>내용</p>' }, 'news', categories);
    assert.equal(result.type, 'blog');
    assert.equal(result.category, 'OpenAI');
    assert.equal(primaryPlacementOf(JSON.parse(JSON.stringify(result)), categories), 'news');
    assert.equal(result.title, '초안');
    assert.equal(result.content, '<p>내용</p>');
    assert.equal(placementSummary(result, name => name, categories), '뉴스 OpenAI');
    assert.equal(toggleEditorPlacement(result, 'blog', categories).category, '개발기');
});

test('Work can accompany News, and replacing the secondary Blog with News keeps Work', () => {
    let result = toggleEditorPlacement({ type: 'work', category: 'UI / UX' }, 'blog', categories);
    result = toggleEditorPlacement(result, 'news', categories);
    assert.equal(result.type, 'work');
    assert.equal(result.category, 'UI / UX');
    assert.equal(result.secondaryType, 'blog');
    assert.equal(categoryIn(result, 'blog'), 'OpenAI');
    assert.equal(isListedIn(result, 'work'), true);
    assert.equal(isListedIn(result, 'blog'), true);
    assert.equal(placementSummary(result, name => name, categories), 'Work UI / UX · 뉴스 OpenAI');
    assert.deepEqual(toggleEditorPlacement(result, 'news', categories), { ...result, secondaryType: null, secondaryCategory: null });
});

test('removing the main Work placement promotes News without losing its category', () => {
    const result = toggleEditorPlacement({ type: 'work', category: 'UI / UX', secondaryType: 'blog', secondaryCategory: '이슈' }, 'work', categories);
    assert.equal(primaryPlacementOf(result, categories), 'news');
    assert.equal(result.category, '이슈');
    assert.equal(result.secondaryType, null);
    assert.deepEqual(toggleEditorPlacement(result, 'news', categories), result);
});

test('a missing news category cannot create a post in the wrong list', () => {
    const original = { type: 'blog' as const, category: '개발기' };
    assert.deepEqual(toggleEditorPlacement(original, 'news', categories.filter(c => c.section !== 'news')), original);
});
