/**
 * AppErrorBoundary - the structural guarantee that NO deliverable generation
 * path (or any render) can silently blank the app or dump the user to the
 * landing page.
 *
 * 2026-06-03 - Root cause of the "hashtag deliverable silently resets to
 * landing" reports: HiC had ZERO React error boundaries, so any error thrown
 * during render unmounted the entire tree (white screen or, combined with a
 * stale-chunk reload, a silent return to landing) with nothing logged. This
 * boundary catches every render error, PRESERVES the user's session (it never
 * clears state or navigates), logs the full error + component stack LOUDLY, and
 * shows an inline recovery panel. It is industry-agnostic - it knows nothing
 * about any deliverable type; it just refuses to let a subtree crash take down
 * the whole workbench.
 */
import React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; info: string | null; }

export class AppErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null, info: null };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        // LOUD, never silent. This is what was missing.
        console.error('[AppErrorBoundary] a render error was caught - the app did NOT reset; session preserved.\n',
            error?.name, error?.message, '\n', error?.stack, '\ncomponentStack:', info?.componentStack);
        this.setState({ info: info?.componentStack || null });
    }

    private reset = () => this.setState({ error: null, info: null });

    private saveAndReload = async () => {
        try {
            const saver = (window as any).__hicSaveSession;
            if (typeof saver === 'function') {
                await Promise.race([saver({ silent: true }), new Promise(r => setTimeout(r, 4000))]);
            }
        } catch { /* reload anyway */ }
        try { window.location.reload(); } catch { /* noop */ }
    };

    render(): React.ReactNode {
        if (!this.state.error) return this.props.children;
        const err = this.state.error;
        return (
            <div role="alert" style={{
                position: 'fixed', inset: 0, zIndex: 2147483646,
                background: 'rgba(13,13,13,0.96)', color: '#F5F5F0',
                fontFamily: 'Archivo, system-ui, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}>
                <div style={{ maxWidth: 720, width: '100%', background: '#141414', border: '1px solid #B8B800', padding: 28 }}>
                    <div style={{ color: '#B8B800', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                        Something in this view crashed - your session was NOT reset
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>
                        A component hit an error while rendering. The rest of your work (corpus, themes, chat)
                        is still in memory. You can try to continue, or save your session and reload for a clean slate.
                    </div>
                    <pre style={{
                        background: '#0D0D0D', color: '#FF8866', fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        padding: 12, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', marginBottom: 16, border: '1px solid #333',
                    }}>{err.name}: {err.message}{this.state.info ? `\n${this.state.info.split('\n').slice(0, 6).join('\n')}` : ''}</pre>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button onClick={this.reset} style={{
                            padding: '10px 20px', background: '#B8B800', color: '#0D0D0D', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                        }}>Try to continue</button>
                        <button onClick={this.saveAndReload} style={{
                            padding: '10px 20px', background: 'transparent', color: '#F5F5F0', border: '1px solid #525252', cursor: 'pointer',
                            fontWeight: 600, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
                        }}>Save session &amp; reload</button>
                    </div>
                </div>
            </div>
        );
    }
}
