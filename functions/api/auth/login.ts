
interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { createSessionCookie, isAllowedAdmin, publicUser } from '../../_utils/auth';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { email, password } = await context.request.json() as any;
        const requestUrl = new URL(context.request.url);
        const isLocalRequest = ['localhost', '127.0.0.1', '0.0.0.0'].includes(requestUrl.hostname);

        // Admin allowlist logic (can be kept or moved to DB role)
        const ADMIN_EMAILS = ['cryingonion77@gmail.com'];

        // Simulate Google Login Mock
        if (password === 'google-auth-mock-token') {
            if (!isLocalRequest) {
                return Response.json({ error: "Local mock login is not allowed here" }, { status: 403 });
            }

            let user: any = await context.env.DB.prepare("SELECT * FROM User WHERE email = ?").bind(email).first();

            if (!user) {
                // Auto-register
                const newUser = {
                    email,
                    name: email.split('@')[0],
                    password: 'google-oauth-user',
                    role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
                    avatarUrl: `https://ui-avatars.com/api/?name=${email.split('@')[0]}`
                };
                await context.env.DB.prepare(
                    "INSERT INTO User (email, name, password, role, avatarUrl) VALUES (?, ?, ?, ?, ?)"
                ).bind(newUser.email, newUser.name, newUser.password, newUser.role, newUser.avatarUrl).run();

                const userPayload = publicUser(newUser);
                return Response.json(userPayload, {
                    headers: {
                        'Set-Cookie': await createSessionCookie(userPayload, context.env, context.request)
                    }
                });
            }
            const userPayload = publicUser(user);
            return Response.json(userPayload, {
                headers: {
                    'Set-Cookie': await createSessionCookie(userPayload, context.env, context.request)
                }
            });
        }

        // Normal Login
        const user: any = await context.env.DB.prepare("SELECT * FROM User WHERE email = ? AND password = ?").bind(email, password).first();

        if (user) {
            if (String(user.password || '').startsWith('google-')) {
                return Response.json({ error: "Use Google login for this account" }, { status: 401 });
            }
            const userPayload = publicUser(user);
            if (userPayload.role === 'admin' && !isAllowedAdmin(userPayload)) {
                return Response.json({ error: "Admin account is not allowed" }, { status: 403 });
            }
            return Response.json(userPayload, {
                headers: {
                    'Set-Cookie': await createSessionCookie(userPayload, context.env, context.request)
                }
            });
        } else {
            return Response.json({ error: "Invalid credentials" }, { status: 401 });
        }
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
