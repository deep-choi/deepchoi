interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { clearSessionCookie } from '../../_utils/auth';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    return Response.json(
        { success: true },
        {
            headers: {
                'Set-Cookie': clearSessionCookie(context.request)
            }
        }
    );
};
