interface Env {
    DB: D1Database;
}

import { renderListingPage } from './_utils/listingPage';

export const onRequestGet: PagesFunction<Env> = (context) => renderListingPage(context, {
    path: '/work',
    kind: 'work',
    title: 'Deepchoi 프로젝트 | UI/UX, 프론트엔드, 바이브코딩',
    heading: '프로젝트',
    description: 'UI/UX 디자인, 프론트엔드 구현, 바이브코딩으로 구축한 Deepchoi의 웹 서비스와 프로젝트 아카이브입니다.'
});
