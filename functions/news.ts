interface Env {
    DB: D1Database;
}

import { renderListingPage } from './_utils/listingPage';

export const onRequestGet: PagesFunction<Env> = (context) => renderListingPage(context, {
    path: '/news',
    title: 'Deepchoi AI 소식 | 새 AI 모델과 업계 소식',
    heading: 'AI 소식',
    description: '새 AI 모델 출시와 업계 소식을 정리하는 Deepchoi의 AI 뉴스 모음입니다.',
    news: true
});
