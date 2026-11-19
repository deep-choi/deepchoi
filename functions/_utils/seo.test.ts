import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildAutomaticSeo,
    DEFAULT_IMAGE,
    pickRenderDescription,
    pickRenderImage,
    sanitizeHtmlForFallback
} from './seo.ts';

test('buildAutomaticSeo syncs seoImage when cover imageUrl changes or replaces a data URI', () => {
    const existing = {
        id: '1766920506878',
        title: '코이월드 - 나만의 잉어키우기 게임',
        subtitle: '잉어를 성장시키고 교배해서 희귀 품종을 발견해보세요',
        imageUrl: 'data:image/webp;base64,OLD_DATA',
        seoImage: 'data:image/webp;base64,OLD_DATA',
        date: '2025-12-22',
    };

    const migrated = buildAutomaticSeo({
        ...existing,
        imageUrl: '/images/new-koi-cover.webp',
    }, existing);
    assert.equal(migrated.seoImage, '/images/new-koi-cover.webp');

    const coverChangedAgain = buildAutomaticSeo({
        ...migrated,
        imageUrl: '/images/koi-cover-v2.webp',
    }, migrated);
    assert.equal(coverChangedAgain.seoImage, '/images/koi-cover-v2.webp');
});

test('buildAutomaticSeo preserves explicit custom seoTitle, seoDescription, and seoImage across later edits', () => {
    const created = buildAutomaticSeo({
        id: '100001',
        title: '원래 제목',
        subtitle: '충분히 긴 글 요약 문장입니다.',
        seoTitle: '직접 작성한 SEO 제목',
        seoDescription: '검색 노출용으로 직접 정성껏 작성한 메타 설명 문장입니다.',
        seoImage: '/images/custom-og.webp',
        imageUrl: '/images/cover.webp',
        date: '2026-11-19',
    });

    assert.equal(created.seoTitle, '직접 작성한 SEO 제목');
    assert.equal(created.seoDescription, '검색 노출용으로 직접 정성껏 작성한 메타 설명 문장입니다.');
    assert.equal(created.seoImage, '/images/custom-og.webp');

    const editedBodyOnly = buildAutomaticSeo({
        ...created,
        content: '<p>본문이 업데이트되었습니다.</p>',
    }, created);

    assert.equal(editedBodyOnly.seoTitle, '직접 작성한 SEO 제목');
    assert.equal(editedBodyOnly.seoDescription, '검색 노출용으로 직접 정성껏 작성한 메타 설명 문장입니다.');
    assert.equal(editedBodyOnly.seoImage, '/images/custom-og.webp');
});

test('pickRenderImage skips data URI seoImage and falls back to valid imageUrl or default image', () => {
    assert.equal(
        pickRenderImage({
            seoImage: 'data:image/webp;base64,AAAA',
            imageUrl: '/images/real-cover.webp',
        }),
        'https://deepchoi.com/images/real-cover.webp'
    );
    assert.equal(
        pickRenderImage({
            seoImage: 'data:image/webp;base64,AAAA',
            imageUrl: 'data:image/webp;base64,BBBB',
        }),
        DEFAULT_IMAGE
    );
});

test('pickRenderDescription replaces generic placeholders like 포트폴리오 with body text', () => {
    const description = pickRenderDescription({
        seoDescription: '포트폴리오',
        subtitle: '포트폴리오',
        description: '',
        content: '<h2>프로젝트 소개</h2><p>테슬라 공식 웹사이트의 탐색 동선과 시각 계층을 재구성한 UI/UX 리뉴얼 케이스입니다.</p>',
    });

    assert.match(description, /테슬라 공식 웹사이트/);
    assert.notEqual(description, '포트폴리오');
});

test('sanitizeHtmlForFallback keeps semantic headings, links, and img alt while removing scripts and data URIs', () => {
    const html = [
        '<h1>섹션 제목</h1>',
        '<p onclick="alert(1)">본문 텍스트 &amp; <a href="https://example.com" onclick="evil()">외부 링크</a> <a href="javascript:alert(2)">위험 링크</a></p>',
        '<ul><li>항목 1</li><li>항목 2</li></ul>',
        '<figure><img src="/images/demo.webp" alt="데모 화면" width="1200" height="675" onerror="alert(3)"><figcaption>캡션</figcaption></figure>',
        '<img src="data:image/png;base64,AAAA" alt="인라인 이미지">',
        '<script>alert("xss")</script>',
        '<div><p>닫히지 않은 문단',
    ].join('');

    const sanitized = sanitizeHtmlForFallback(html);
    assert.match(sanitized, /<h2>섹션 제목<\/h2>/);
    assert.match(sanitized, /<a href="https:\/\/example\.com" rel="noopener noreferrer">외부 링크<\/a>/);
    assert.doesNotMatch(sanitized, /javascript:/i);
    assert.doesNotMatch(sanitized, /onclick|onerror|<script/i);
    assert.doesNotMatch(sanitized, /data:image/);
    assert.match(sanitized, /<img src="\/images\/demo\.webp" alt="데모 화면" width="1200" height="675"/);
    assert.match(sanitized, /<ul><li>항목 1<\/li><li>항목 2<\/li><\/ul>/);
    assert.match(sanitized, /<\/p>$/);
});
