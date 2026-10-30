/** Body headings use one consistent size; page and entry titles are separate. */
export const normalizeBodyHeadings = (root: HTMLElement): void => {
    root.querySelectorAll('h1,h2,h4,h5,h6').forEach(heading => {
        if (heading.closest('pre,code')) return;
        const replacement = root.ownerDocument.createElement('h3');
        Array.from(heading.attributes).forEach(attribute => replacement.setAttribute(attribute.name, attribute.value));
        while (heading.firstChild) replacement.appendChild(heading.firstChild);
        heading.replaceWith(replacement);
    });
};
