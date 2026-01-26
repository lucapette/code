import {Hono} from "hono";

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
    console.error("Global error handler caught:", err); // Log the error if it's not known

    return c.json({success: false, errors: [{code: 7000, message: "Internal Server Error"}],}, 500);
});

app.get("/redirect/:isbn", (c) => {
    const isbn = c.req.param("isbn");

    return c.redirect(`https://app.thestorygraph.com/search?search_term=${isbn}`);
});

export default app;
