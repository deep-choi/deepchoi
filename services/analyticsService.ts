export const analyticsService = {
    trackPageView: (path: string, projectId?: string): void => {
        const payload = JSON.stringify({
            path,
            projectId: projectId || null,
            referrer: document.referrer || ''
        });

        fetch('/api/analytics/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
        }).catch(() => {
            // Analytics should never disturb the browsing experience.
        });
    }
};
