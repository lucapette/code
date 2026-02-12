import {Hono} from "hono";
import parse from "node-html-parser";

const baseUrl = "https://app.thestorygraph.com";

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
    console.error("Global error handler caught:", err); // Log the error if it's not known

    return c.json(
        {
            success: false,
            errors: [{code: 7000, message: "Internal Server Error"}],
        },
        500,
    );
});

app.get("/redirect/:isbn", async (c) => {
    const isbn = c.req.param("isbn");

    try {
        const response = await fetch(
            `${baseUrl}/search?search_term=${isbn}`,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept:
                        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate, br",
                    Referer: "https://lucapette.me/",
                    DNT: "1",
                    Connection: "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-GPC": "1",
                },
            },
        );

        if (!response.ok) {
            return c.json({error: `Failed to fetch page: ${response.status}`}, 500);
        }

        const html = await response.text();
        const redirectUrl = extract(html);

        if (!redirectUrl) {
            return c.text("could not extract redirect URL", 404);
        }

        return c.redirect(baseUrl + redirectUrl);
    } catch (error) {
        console.error("Error processing redirect:", error);
        return c.json({error: "Failed to process redirect"}, 500);
    }
});

function extract(html: string): string | null {
    const document = parse(html);
    const firstLink = document.querySelector("a.list-option.book-list-option");


    return firstLink?.getAttribute("href") || null;
}

export default app;
