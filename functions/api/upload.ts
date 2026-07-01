
interface Env {
    BUCKET: R2Bucket;
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../_utils/auth';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        const formData = await context.request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return Response.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Generate a unique filename using UUID and original name
        // Sanitize filename to avoid special characters issues
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${crypto.randomUUID()}-${safeName}`;

        // Upload to R2
        // httpMetadata contentType is important for serving correct headers later
        await context.env.BUCKET.put(filename, file, {
            httpMetadata: {
                contentType: file.type,
            }
        });

        // Return the relative URL which will be handled by the images function
        const url = `/images/${filename}`;
        return Response.json({ url, success: true });
    } catch (err) {
        console.error('Upload Error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
};
