interface Env {}

export const onRequest: (context: { request: Request, env: Env }) => Response = (context) => {
    const { request } = context;
    const url = new URL(request.url);
    const customIconUrl = url.searchParams.get('icon');

    const manifest = {
        "short_name": "Classroom",
        "name": "Class Reservation System",
        "start_url": ".",
        "display": "standalone",
        "theme_color": "#ffffff",
        "background_color": "#ffffff",
        "icons": [
            {
                "src": customIconUrl || "/icon-192x192.png",
                "type": "image/png",
                "sizes": "192x192",
                "purpose": "any maskable"
            },
            {
                "src": customIconUrl || "/icon-512x512.png",
                "type": "image/png",
                "sizes": "512x512",
                "purpose": "any maskable"
            }
        ]
    };

    return new Response(JSON.stringify(manifest), {
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'no-cache, no-store, must-revalidate' // Ensure fresh manifest on param change
        },
    });
};
