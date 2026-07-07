const express = require("express");
const path = require("path");
const compression = require("compression");

const app = express();

const PORT = process.env.PORT || 6117;
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(compression());

/*
  Do NOT force HTTPS here.
  Do NOT use Helmet COOP/OAC headers while running from plain HTTP public IP.
  Your site is: http://70.76.73.255:6113
*/

app.use((req, res, next) => {
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("Origin-Agent-Cluster");

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");

    next();
});

app.use(
    express.static(PUBLIC_DIR, {
        etag: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith(".html")) {
                res.setHeader("Cache-Control", "no-cache");
            }

            if (filePath.endsWith("service-worker.js")) {
                res.setHeader("Cache-Control", "no-cache");
                res.setHeader("Content-Type", "application/javascript");
            }

            if (filePath.endsWith("manifest.json")) {
                res.setHeader("Cache-Control", "no-cache");
                res.setHeader("Content-Type", "application/manifest+json");
            }

            if (
                filePath.endsWith(".css") ||
                filePath.endsWith(".js") ||
                filePath.endsWith(".png") ||
                filePath.endsWith(".jpg") ||
                filePath.endsWith(".jpeg") ||
                filePath.endsWith(".webp") ||
                filePath.endsWith(".svg")
            ) {
                res.setHeader("Cache-Control", "public, max-age=3600");
            }
        }
    })
);

app.get("/:page", (req, res, next) => {
    const page = req.params.page;

    if (page.includes(".")) {
        return next();
    }

    res.sendFile(path.join(PUBLIC_DIR, `${page}.html`), err => {
        if (err) next();
    });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const HOST = "0.0.0.0";
const PUBLIC_URL = "http://70.76.73.255:6117";

app.listen(PORT, HOST, () => {
    console.log(`Sault Locks Tracker running on ${PUBLIC_URL}`);
});