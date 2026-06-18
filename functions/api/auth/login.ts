
interface Env {
    DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { email, password } = await context.request.json() as any;
        const requestUrl = new URL(context.request.url);
        const isLocalRequest = ['localhost', '127.0.0.1', '0.0.0.0'].includes(requestUrl.hostname);

        // Admin allowlist logic (can be kept or moved to DB role)
        const ADMIN_EMAILS = ['admin@example.com', 'dongjun.choi@example.com', 'cryingonion77@gmail.com'];

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
                    password: 'google-login-user',
                    role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
                    avatarUrl: `https://ui-avatars.com/api/?name=${email.split('@')[0]}`
                };
                await context.env.DB.prepare(
                    "INSERT INTO User (email, name, password, role, avatarUrl) VALUES (?, ?, ?, ?, ?)"
                ).bind(newUser.email, newUser.name, newUser.password, newUser.role, newUser.avatarUrl).run();

                return Response.json(newUser);
            }
            return Response.json(user);
        }

        // Normal Login
        const user: any = await context.env.DB.prepare("SELECT * FROM User WHERE email = ? AND password = ?").bind(email, password).first();

        if (user) {
            return Response.json(user);
        } else {
            return Response.json({ error: "Invalid credentials" }, { status: 401 });
        }
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
