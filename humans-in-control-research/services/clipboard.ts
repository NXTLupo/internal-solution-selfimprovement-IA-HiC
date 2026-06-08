/**
 * clipboard.ts - tiny browser clipboard helper used by Research Browser
 * cards to copy chunk pointers (e.g. articles/openalex/x.md#c3) so users
 * can cite them inline in chat prompts or external notes.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { /* fall through */ }
    // Fallback for older browsers / non-secure contexts.
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
    } catch {
        return false;
    }
}
