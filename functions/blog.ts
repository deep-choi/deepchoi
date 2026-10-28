interface Env {
    DB: D1Database;
}

import { renderListingPage } from './_utils/listingPage';

export const onRequestGet: PagesFunction<Env> = (context) => renderListingPage(context, {
    path: '/blog',
    title: 'Deepchoi 블로그 | AI, 개발, UI/UX 기록',
    heading: 'Deepchoi 블로그',
    description: 'AI, Python, 프론트엔드와 UI/UX 구현 과정을 정리하는 Deepchoi 기술 블로그입니다.',
    news: false
});
