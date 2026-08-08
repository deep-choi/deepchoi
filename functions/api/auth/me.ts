interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { createSessionCookie, getSessionUser } from '../../_utils/auth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const user = await getSessionUser(context.request, context.env);
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }
        return Response.json(user, {
            headers: {
                'Set-Cookie': await createSessionCookie(user, context.env, context.request)
            }
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        return Response.json({ error: message }, { status: 500 });
    }
};
