export const dynamic = "force-static";

export function GET() {
  const body = {
    name: "Famflix Demo",
    short_name: "Famflix Demo",
    description: "Famflix Originals — demo preview.",
    start_url: "/?demo=1",
    scope: "/",
    id: "/?demo=1",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0f",
    theme_color: "#0b0b0f",
    icons: [
      { src: "/icon1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
