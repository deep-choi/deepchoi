import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const CONTACT_EMAIL = 'cryingonion77@gmail.com';
const KAKAO_OPEN_CHAT_URL = 'https://open.kakao.com/me/deepchoi';
const EMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent('프로젝트 문의')}`;

export const FloatingContact: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (/^\/(admin|login|signup)(\/|$)/.test(location.pathname)) {
    return null;
  }

  const optionClassName = 'group flex w-full items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-[#f7f8fc] focus-visible:bg-[#f7f8fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4169E1]/30';
  const kakaoOptionContent = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-[#111111]">
        <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.9 3 3 6.2 3 10.25c0 2.63 1.64 4.94 4.12 6.22l-.92 3.38a.42.42 0 0 0 .64.46l3.95-2.62c.4.05.8.07 1.21.07 5.1 0 9-3.21 9-7.51S17.1 3 12 3Z" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-[#111111]">카카오톡으로 문의하기</span>
        <span className="mt-1 block text-[13px] leading-5 text-[#666666]">빠르고 편하게 대화할 수 있어요.</span>
      </span>
      <svg aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-[#a0a0a0] transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
      </svg>
    </>
  );

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3 md:bottom-6 md:right-6"
    >
      <div
        id="floating-contact-panel"
        role="dialog"
        aria-label="문의 방법"
        aria-hidden={!isOpen}
        className={`w-[min(360px,calc(100vw-32px))] origin-bottom-right overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_20px_60px_rgba(17,17,17,0.16)] transition-all duration-200 ease-out ${isOpen
          ? 'pointer-events-auto visible translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none invisible translate-y-2 scale-[0.98] opacity-0'
          }`}
      >
        <div className="border-b border-[#eeeeee] px-5 py-5">
          <p className="text-[18px] font-semibold tracking-[-0.02em] text-[#111111]">무엇을 도와드릴까요?</p>
        </div>

        <div className="p-2">
          {KAKAO_OPEN_CHAT_URL ? (
            <a href={KAKAO_OPEN_CHAT_URL} target="_blank" rel="noreferrer" className={optionClassName}>
              {kakaoOptionContent}
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label="카카오톡 문의 링크 준비 중"
              className={`${optionClassName} cursor-default disabled:hover:bg-transparent`}
            >
              {kakaoOptionContent}
            </button>
          )}

          <a
            href={EMAIL_COMPOSE_URL}
            target="_blank"
            rel="noreferrer"
            className={optionClassName}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef1fd] text-[#4169E1]">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-[#111111]">문의 남기기</span>
              <span className="mt-1 block text-[13px] leading-5 text-[#666666]">프로젝트·협업·피드백을 남겨주세요.</span>
            </span>
            <svg aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-[#a0a0a0] transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        aria-label={isOpen ? '문의 메뉴 닫기' : '문의 메뉴 열기'}
        aria-expanded={isOpen}
        aria-controls="floating-contact-panel"
        className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4169E1]/25 active:translate-y-0 ${isOpen ? 'rotate-90 bg-[#111111]' : 'bg-[#4169E1] hover:bg-[#3458c7]'}`}
      >
        {isOpen ? (
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 17.5 3.8 21l3.8-1.15A9 9 0 1 0 5 17.5Z" />
            <path strokeLinecap="round" d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" />
          </svg>
        )}
      </button>
    </div>
  );
};
