
interface Env {
    DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { email, password, name } = await context.request.json() as any;
        const existing: any = await context.env.DB.prepare("SELECT * FROM User WHERE email = ?").bind(email).first();

        if (existing) {
            return Response.json({ error: "User already exists" }, { status: 400 });
        }

        const newUser = {
            email,
            name: name || email.split('@')[0],
            password,
            role: 'user',
            avatarUrl: `https://ui-avatars.com/api/?name=${name || email.split('@')[0]}`
        };

        await context.env.DB.prepare(
            "INSERT INTO User (email, name, password, role, avatarUrl) VALUES (?, ?, ?, ?, ?)"
        ).bind(newUser.email, newUser.name, newUser.password, newUser.role, newUser.avatarUrl).run();

        return Response.json(newUser, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
