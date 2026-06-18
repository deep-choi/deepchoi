
interface Env {
    DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { accessToken } = await context.request.json() as any;
        if (!accessToken) {
            return Response.json({ error: "Missing Google access token" }, { status: 400 });
        }

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userInfoResponse.ok) {
            return Response.json({ error: "Invalid Google access token" }, { status: 401 });
        }

        const userInfo = await userInfoResponse.json() as any;
        const { email, name, picture } = userInfo;

        // Admin allowlist logic (Production)
        const ADMIN_EMAILS = ['admin@example.com', 'dongjun.choi@example.com', 'cryingonion77@gmail.com'];

        // Check if user exists
        let user: any = await context.env.DB.prepare("SELECT * FROM User WHERE email = ?").bind(email).first();

        if (!user) {
            // Auto-register new Google user
            const newUser = {
                email,
                name: name || email.split('@')[0],
                // Use a dummy password for Google users or handle null passwords in schema (simplified here)
                password: 'google-oauth-user-' + Date.now(),
                role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
                avatarUrl: picture || `https://ui-avatars.com/api/?name=${name || email.split('@')[0]}`
            };

            await context.env.DB.prepare(
                "INSERT INTO User (email, name, password, role, avatarUrl) VALUES (?, ?, ?, ?, ?)"
            ).bind(newUser.email, newUser.name, newUser.password, newUser.role, newUser.avatarUrl).run();

            return Response.json(newUser);
        }

        // If user exists, return user info (simulate login)
        // Optionally update avatar if changed
        if (user.avatarUrl !== picture && picture) {
            await context.env.DB.prepare("UPDATE User SET avatarUrl = ? WHERE email = ?").bind(picture, email).run();
            user.avatarUrl = picture;
        }

        return Response.json(user);

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
