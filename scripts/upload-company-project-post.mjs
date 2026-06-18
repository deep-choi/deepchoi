const API_ORIGIN = process.env.PORTFOLIO_API_ORIGIN || 'https://deepchoi.com';

const author = {
  name: 'Choi',
  role: 'UI/UX Designer & Developer',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
};

const coverSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="46%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#08111b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#ff5b60"/>
      <stop offset="47%" stop-color="#39b54a"/>
      <stop offset="100%" stop-color="#1983fc"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.36"/>
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect x="72" y="72" width="1456" height="756" rx="34" fill="#101923" stroke="#263241"/>
  <rect x="112" y="112" width="1376" height="7" rx="3.5" fill="url(#accent)"/>
  <text x="120" y="190" fill="#9fb0c5" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">3 MONTH COMPANY PROJECTS</text>
  <text x="120" y="285" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="800">B2B 웹서비스 5종 구축</text>
  <text x="120" y="345" fill="#c9d5e5" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600">행사 · 렌탈 · 전자계약 · CMS · 예약 운영 시스템</text>
  <g filter="url(#softShadow)">
    <rect x="120" y="430" width="260" height="180" rx="22" fill="#162333" stroke="#2c3d50"/>
    <rect x="410" y="430" width="260" height="180" rx="22" fill="#162333" stroke="#2c3d50"/>
    <rect x="700" y="430" width="260" height="180" rx="22" fill="#162333" stroke="#2c3d50"/>
    <rect x="990" y="430" width="260" height="180" rx="22" fill="#162333" stroke="#2c3d50"/>
    <rect x="570" y="645" width="460" height="118" rx="22" fill="#162333" stroke="#2c3d50"/>
  </g>
  <text x="152" y="494" fill="#ff7c81" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">Humanpartner</text>
  <text x="152" y="540" fill="#d7e1ef" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">MICE 예약 · 견적</text>
  <text x="152" y="574" fill="#8fa2b7" font-family="Arial, Helvetica, sans-serif" font-size="18">모바일 퍼스트 운영 UI</text>
  <text x="442" y="494" fill="#6ee7b7" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">Sign</text>
  <text x="442" y="540" fill="#d7e1ef" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">전자계약 링크 서명</text>
  <text x="442" y="574" fill="#8fa2b7" font-family="Arial, Helvetica, sans-serif" font-size="18">PDF · 감사 로그 · 해시</text>
  <text x="732" y="494" fill="#93c5fd" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">Micepartner</text>
  <text x="732" y="540" fill="#d7e1ef" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">기업형 홈페이지</text>
  <text x="732" y="574" fill="#8fa2b7" font-family="Arial, Helvetica, sans-serif" font-size="18">포트폴리오 · 문의 CMS</text>
  <text x="1022" y="494" fill="#fbbf24" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">Rentalpartner</text>
  <text x="1022" y="540" fill="#d7e1ef" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">B2B 렌탈몰</text>
  <text x="1022" y="574" fill="#8fa2b7" font-family="Arial, Helvetica, sans-serif" font-size="18">상품 · 견적 · 알림</text>
  <text x="604" y="694" fill="#86efac" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800">Miceday</text>
  <text x="604" y="738" fill="#d7e1ef" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">MICE 상품/예약/얼라이언스 운영</text>
  <text x="120" y="782" fill="#93a4b8" font-family="Arial, Helvetica, sans-serif" font-size="22">React · TypeScript · Vite · Firebase · Supabase · Admin CMS</text>
</svg>`;

const content = `
<p>회사에서 약 3개월 동안 진행했던 5개의 웹서비스 프로젝트를 하나의 포트폴리오 케이스로 정리했습니다. 각각은 성격이 조금씩 달랐지만, 공통적으로 “운영자가 직접 관리할 수 있는 서비스”를 목표로 했습니다.</p>

<p>단순한 랜딩 페이지보다 상품, 예약, 문의, 전자계약, CMS, 관리자 대시보드처럼 실제 업무 흐름을 화면과 데이터 구조로 연결하는 작업이 많았습니다. 이 글은 공개 가능한 범위에서 제가 맡았던 구조와 기능 중심으로 정리한 기록입니다.</p>

<h2>프로젝트 개요</h2>
<ul>
  <li><strong>기간</strong>: 약 3개월</li>
  <li><strong>역할</strong>: UI/UX 설계, React/TypeScript 프론트엔드 구현, 관리자 기능 구성, 데이터 연동, 배포/운영 문서화</li>
  <li><strong>공통 스택</strong>: React, TypeScript, Vite, Tailwind CSS, Firebase, Supabase, Firestore, Cloud Functions</li>
  <li><strong>핵심 방향</strong>: 모바일 우선 UX, 관리자 중심 CMS, 운영자가 수정 가능한 콘텐츠 구조, 문의/예약/계약 같은 업무 흐름 자동화</li>
</ul>

<h2>1. Humanpartner / 행사어때</h2>
<figure style="margin:24px 0 32px;">
  <img src="/captures/company-projects/humanpartner-home-desktop.png" alt="Humanpartner 홈페이지 데스크톱 캡처" style="width:100%;border-radius:16px;border:1px solid #30363d;" />
  <figcaption style="margin-top:10px;color:#8b949e;font-size:14px;">Humanpartner 홈페이지 메인 화면</figcaption>
</figure>
<p>Humanpartner는 MICE 예약과 파트너 운영을 위한 웹 애플리케이션입니다. 사용자는 상품을 탐색하고 견적을 요청하며, 관리자는 상품, 예약, 회원, 문의, FAQ, 시공 사례 등을 관리할 수 있도록 구성했습니다.</p>
<p>작업 중 특히 신경 쓴 부분은 모바일 사용성이었습니다. 하단 내비게이션, 반응형 헤더, 빠른 카테고리 진입, 상품 상세 화면의 정보 구조를 정리해 모바일에서도 앱처럼 탐색할 수 있는 흐름을 만들었습니다. 브랜드는 “행사어때” 방향으로 리브랜딩하며 컬러와 문구 톤도 함께 정리했습니다.</p>

<h2>2. Humanpartner Sign</h2>
<figure style="margin:24px 0 32px;">
  <img src="/captures/company-projects/humanpartner-sign-home-desktop.png" alt="Humanpartner Sign 로그인 화면 데스크톱 캡처" style="width:100%;border-radius:16px;border:1px solid #30363d;" />
  <figcaption style="margin-top:10px;color:#8b949e;font-size:14px;">Humanpartner Sign 공개 로그인 화면</figcaption>
</figure>
<p>Humanpartner Sign은 전자계약을 위한 별도 서비스입니다. 관리자가 계약 템플릿을 만들고, 고객은 로그인 없이 전달받은 링크에서 계약 내용을 확인한 뒤 서명할 수 있는 구조입니다.</p>
<p>계약 템플릿은 스프레드시트 형태의 그리드 데이터로 관리하고, 계약 생성 시점의 템플릿을 스냅샷으로 저장해 이후 템플릿 수정과 완료 계약을 분리했습니다. 서명 완료 후에는 PDF 저장, 문서 해시, 감사 로그, 메일 트리거까지 이어지는 흐름을 설계했습니다. 보안 측면에서는 공개 쓰기 제한, 서명 토큰 만료, 서버 타임스탬프, 완성 문서의 불변성 같은 개선 항목도 별도로 정리했습니다.</p>

<h2>3. Micepartner</h2>
<figure style="margin:24px 0 32px;">
  <img src="/captures/company-projects/micepartner-home-desktop.png" alt="Micepartner 홈페이지 데스크톱 캡처" style="width:100%;border-radius:16px;border:1px solid #30363d;" />
  <figcaption style="margin-top:10px;color:#8b949e;font-size:14px;">Micepartner 기업 홈페이지 메인 화면</figcaption>
</figure>
<p>Micepartner는 MICE 기업 홈페이지와 운영 CMS를 함께 갖춘 프로젝트입니다. 서비스 소개, 포트폴리오, 리소스, 회사 소개, 문의 페이지를 구성하고, 관리자 화면에서 주요 콘텐츠와 문의 상태를 관리할 수 있도록 만들었습니다.</p>
<p>포트폴리오 상세, 공지/자료실, 멤버 소개, FAQ, 문의 관리처럼 회사 소개 사이트에서 자주 바뀌는 영역을 CMS로 분리했습니다. 운영자가 개발자에게 매번 요청하지 않아도 텍스트, 카드, CTA, 이미지, 상세 페이지 데이터를 직접 다룰 수 있게 한 것이 핵심이었습니다.</p>

<h2>4. Rentalpartner / 렌탈어때</h2>
<figure style="margin:24px 0 32px;">
  <img src="/captures/company-projects/rentalpartner-home-desktop.png" alt="Rentalpartner 홈페이지 데스크톱 캡처" style="width:100%;border-radius:16px;border:1px solid #30363d;" />
  <figcaption style="margin-top:10px;color:#8b949e;font-size:14px;">Rentalpartner / 렌탈어때 메인 화면</figcaption>
</figure>
<p>Rentalpartner는 B2B 렌탈 쇼핑몰 성격의 서비스입니다. 사용자는 상품 목록과 상세 페이지를 확인하고 견적 장바구니를 통해 요청을 보낼 수 있으며, 관리자는 상품, 카테고리, 섹션, 회원, 문의, GNB, FAQ, 견적 메일 설정을 관리합니다.</p>
<p>Firebase Authentication, Supabase PostgreSQL/Storage, Firebase Functions를 함께 사용했습니다. 견적 요청 알림, 이메일 인증, 상품 섹션 노출, 추천 카테고리 탭, 관리자용 상품/문의 관리 흐름을 연결해 실제 운영몰에 가까운 구조로 만들었습니다.</p>

<h2>5. Miceday</h2>
<figure style="margin:24px 0 32px;">
  <img src="/captures/company-projects/miceday-home-desktop.png" alt="Miceday 홈페이지 데스크톱 캡처" style="width:100%;border-radius:16px;border:1px solid #30363d;" />
  <figcaption style="margin-top:10px;color:#8b949e;font-size:14px;">Miceday / 행사어때 메인 화면</figcaption>
</figure>
<p>Miceday는 MICE 상품, 예약, 얼라이언스 정보를 다루는 서비스입니다. 공개 화면에서는 상품 탐색, 상세 페이지, 검색, 회사/제휴/고객센터 페이지를 제공하고, 관리자 화면에서는 CMS, 섹션, 카테고리, 상품, 예약, 회원, 전체 메뉴, FAQ, 1:1 문의를 관리합니다.</p>
<p>대전·충청 MICE 얼라이언스 소개 페이지와 회원사/카테고리 관리 기능도 포함했습니다. 패키지 상품과 옵션 품목을 나누어 관리하고, 상품 코드 기반 이동, 검색 결과, 예약 확인까지 이어지는 운영 흐름을 구성했습니다.</p>

<h2>공통으로 해결한 문제</h2>
<ul>
  <li><strong>관리자 친화적인 구조</strong>: 콘텐츠, 상품, 문의, 예약, 계약을 운영자가 직접 수정할 수 있게 관리 화면을 설계했습니다.</li>
  <li><strong>반복 가능한 패턴</strong>: 프로젝트마다 다른 도메인을 다루면서도 CMS, 리스트/상세, 상태 관리, 검색, 관리자 인증 같은 공통 패턴을 재사용했습니다.</li>
  <li><strong>모바일 우선 UX</strong>: 실제 고객이 모바일에서 진입할 가능성이 높은 서비스는 하단 내비게이션과 짧은 탐색 동선을 우선했습니다.</li>
  <li><strong>데이터와 화면의 연결</strong>: 화면만 만드는 것이 아니라 Firestore, Supabase, Storage, Functions와 연결해 운영 데이터가 흐르도록 구현했습니다.</li>
  <li><strong>운영 리스크 정리</strong>: 전자계약, 문의, 예약처럼 데이터 신뢰도가 중요한 영역은 권한, 로그, 문서 보존, 알림 흐름을 함께 검토했습니다.</li>
</ul>

<h2>배운 점</h2>
<p>3개월 동안 여러 서비스를 동시에 다루면서 가장 크게 배운 점은 “좋은 화면”과 “운영 가능한 화면”은 다르다는 것이었습니다. 예쁘게 보이는 것만으로는 부족했고, 관리자가 어디서 무엇을 수정해야 하는지, 사용자가 어떤 경로로 문의나 예약까지 도달하는지, 데이터가 어느 시점에 확정되는지가 중요했습니다.</p>

<p>이 경험을 통해 React 기반의 프론트엔드 구현뿐 아니라 관리자 CMS 구조, 서비스별 정보 설계, 모바일 사용성, Firebase/Supabase 연동, 배포와 운영 문서화까지 한 흐름으로 보는 감각을 얻었습니다.</p>

<blockquote>회사 내부 정보와 실제 운영 데이터는 제외하고, 공개 가능한 범위의 기능과 구조만 포트폴리오용으로 정리했습니다.</blockquote>
`;

const project = {
  id: 'company-b2b-platforms-20260528',
  title: '3개월간 구축한 B2B 웹서비스 5종',
  subtitle: 'Humanpartner, Sign, Micepartner, Rentalpartner, Miceday 프로젝트 회고',
  description:
    '회사에서 약 3개월 동안 진행한 행사, 렌탈, 전자계약, CMS, 예약 운영 웹서비스 5종을 UI/UX와 프론트엔드 구현 관점에서 정리한 포트폴리오입니다.',
  tech: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Firebase', 'Supabase', 'CMS', 'Admin'],
  tags: ['B2B Platform', 'Admin CMS', 'MICE', 'Rental', 'E-Sign', 'React', 'TypeScript'],
  imageUrl: `data:image/svg+xml;base64,${Buffer.from(coverSvg).toString('base64')}`,
  category: '바이브코딩',
  type: 'work',
  date: '2026-05-28',
  content,
  author,
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

async function main() {
  const detailUrl = `${API_ORIGIN}/api/projects/${encodeURIComponent(project.id)}`;
  const listUrl = `${API_ORIGIN}/api/projects`;

  const exists = await fetch(detailUrl).then((response) => response.ok);
  const url = exists ? detailUrl : listUrl;
  const method = exists ? 'PUT' : 'POST';

  await requestJson(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });

  console.log(`${exists ? 'Updated' : 'Created'}: ${project.title}`);
  console.log(`${API_ORIGIN}/post/${project.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
