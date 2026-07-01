interface SessionEnv {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

export interface SessionUser {
    email: string;
    name: string;
    role: 'admin' | 'user';
    avatarUrl?: string;
}

const SESSION_COOKIE = 'deepchoi_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const LOCAL_SECRET = 'deepchoi-local-development-session-secret';
const ADMIN_EMAILS = ['cryingonion77@gmail.com'];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const isLocalHost = (request: Request): boolean => {
    const hostname = new URL(request.url).hostname;
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
};

const getSessionSecret = (env: SessionEnv, request: Request): string => {
    if (env.ADMIN_SESSION_SECRET) return env.ADMIN_SESSION_SECRET;
    if (isLocalHost(request)) return LOCAL_SECRET;
    throw new Error('ADMIN_SESSION_SECRET is not configured');
};

const base64UrlEncode = (input: string | ArrayBuffer): string => {
    const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (input: string): string => {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return decoder.decode(bytes);
};

const sign = async (value: string, secret: string): Promise<string> => {
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
    return base64UrlEncode(signature);
};

const getCookie = (request: Request, name: string): string | null => {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const prefix = `${name}=`;
    const cookie = cookies.find(item => item.startsWith(prefix));
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

export const publicUser = (user: any): SessionUser => ({
    email: user.email,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'user',
    avatarUrl: user.avatarUrl || undefined
});

export const isAllowedAdmin = (user: SessionUser): boolean =>
    user.role === 'admin' && ADMIN_EMAILS.includes(user.email);

export const createSessionCookie = async (
    user: SessionUser,
    env: SessionEnv,
    request: Request
): Promise<string> => {
    const secret = getSessionSecret(env, request);
    const payload = base64UrlEncode(JSON.stringify({
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
    }));
    const signature = await sign(payload, secret);
    const secure = isLocalHost(request) ? '' : '; Secure';

    return `${SESSION_COOKIE}=${encodeURIComponent(`${payload}.${signature}`)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
};

export const clearSessionCookie = (request: Request): string => {
    const secure = isLocalHost(request) ? '' : '; Secure';
    return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
};

export const getSessionUser = async (request: Request, env: SessionEnv): Promise<SessionUser | null> => {
    const token = getCookie(request, SESSION_COOKIE);
    if (!token) return null;

    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const secret = getSessionSecret(env, request);
    const expectedSignature = await sign(payload, secret);
    if (signature !== expectedSignature) return null;

    const session = JSON.parse(base64UrlDecode(payload)) as { email?: string; exp?: number };
    if (!session.email || !session.exp || session.exp < Math.floor(Date.now() / 1000)) {
        return null;
    }

    const user: any = await env.DB.prepare(
        'SELECT email, name, role, avatarUrl FROM User WHERE email = ?'
    ).bind(session.email).first();

    return user ? publicUser(user) : null;
};

export const requireAdmin = async (
    context: EventContext<SessionEnv, string, unknown>
): Promise<{ user: SessionUser } | { response: Response }> => {
    try {
        const user = await getSessionUser(context.request, context.env);
        if (!user) {
            return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
        }
        if (!isAllowedAdmin(user)) {
            return { response: Response.json({ error: 'Admin access required' }, { status: 403 }) };
        }
        return { user };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        return { response: Response.json({ error: message }, { status: 500 }) };
    }
};
