const getCarouselParts = (carousel: HTMLElement) => {
    const track = carousel.querySelector('.image-carousel-track') as HTMLElement | null;
    const slides = track ? Array.from(track.querySelectorAll('.image-carousel-slide')) as HTMLElement[] : [];

    return { track, slides };
};

const getActiveIndex = (track: HTMLElement, slideCount: number) => {
    if (slideCount <= 1 || track.clientWidth <= 0) return 0;

    return Math.min(
        slideCount - 1,
        Math.max(0, Math.round(track.scrollLeft / track.clientWidth))
    );
};

const createCarouselButton = (action: 'prev' | 'next') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `image-carousel-nav image-carousel-${action}`;
    button.dataset.carouselAction = action;
    button.setAttribute('aria-label', action === 'prev' ? '이전 이미지' : '다음 이미지');
    button.innerHTML = action === 'prev' ? '&lsaquo;' : '&rsaquo;';
    return button;
};

const ensureCarouselControls = (carousel: HTMLElement) => {
    if (!carousel.querySelector('.image-carousel-prev')) {
        carousel.appendChild(createCarouselButton('prev'));
    }

    if (!carousel.querySelector('.image-carousel-next')) {
        carousel.appendChild(createCarouselButton('next'));
    }
};

const ensureCarouselIndicator = (carousel: HTMLElement, slideCount: number) => {
    let indicator = carousel.querySelector('.image-carousel-indicator') as HTMLElement | null;

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'image-carousel-indicator';

        const status = document.createElement('span');
        status.className = 'image-carousel-status';

        const dots = document.createElement('span');
        dots.className = 'image-carousel-dots';

        indicator.appendChild(status);
        indicator.appendChild(dots);
        carousel.appendChild(indicator);
    }

    const dots = indicator.querySelector('.image-carousel-dots') as HTMLElement | null;
    if (dots && dots.children.length !== slideCount) {
        dots.textContent = '';
        Array.from({ length: slideCount }, (_, index) => {
            const dot = document.createElement('span');
            dot.className = 'image-carousel-dot';
            dot.setAttribute('aria-hidden', 'true');
            dot.dataset.slideIndex = String(index);
            dots.appendChild(dot);
            return dot;
        });
    }
};

export const updateCarouselState = (carousel: HTMLElement) => {
    const { track, slides } = getCarouselParts(carousel);
    if (!track || slides.length === 0) return;

    const activeIndex = getActiveIndex(track, slides.length);
    const status = carousel.querySelector('.image-carousel-status') as HTMLElement | null;
    const dots = Array.from(carousel.querySelectorAll('.image-carousel-dot')) as HTMLElement[];

    if (status) {
        status.textContent = `${activeIndex + 1} / ${slides.length}`;
    }

    dots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === activeIndex);
    });
};

export const enhanceCarousel = (carousel: HTMLElement) => {
    const { slides } = getCarouselParts(carousel);
    if (slides.length === 0) return;

    ensureCarouselControls(carousel);
    ensureCarouselIndicator(carousel, slides.length);
    updateCarouselState(carousel);
};

export const moveCarousel = (carousel: HTMLElement, direction: -1 | 1) => {
    const { track, slides } = getCarouselParts(carousel);
    if (!track || slides.length === 0) return;

    const currentIndex = getActiveIndex(track, slides.length);
    const nextIndex = Math.min(slides.length - 1, Math.max(0, currentIndex + direction));

    track.scrollTo({
        left: nextIndex * track.clientWidth,
        behavior: 'smooth'
    });

    window.setTimeout(() => updateCarouselState(carousel), 360);
};

export const setupCarousel = (carousel: HTMLElement) => {
    enhanceCarousel(carousel);

    const track = carousel.querySelector('.image-carousel-track') as HTMLElement | null;
    if (!track) return () => undefined;

    let frame = 0;
    const handleScroll = () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => updateCarouselState(carousel));
    };

    track.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
        if (frame) window.cancelAnimationFrame(frame);
        track.removeEventListener('scroll', handleScroll);
    };
};
