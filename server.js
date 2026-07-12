const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function createServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.join(root, requestedPath);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, contents) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const extension = path.extname(filePath);
      response.writeHead(200, {
        "Content-Type": mimeTypes[extension] || "application/octet-stream"
      });
      response.end(contents);
    });
  });
}

function getNetworkUrls(port) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((networkInterface) => {
      return networkInterface && networkInterface.family === "IPv4" && !networkInterface.internal;
    })
    .map((networkInterface) => `http://${networkInterface.address}:${port}`);
}

if (require.main === module) {
  const port = process.env.PORT || 5173;
  const host = process.env.HOST || "0.0.0.0";
  const server = createServer();

  server.listen(port, host, () => {
    console.log(`Facelympic MVP running at http://localhost:${port}`);
    getNetworkUrls(port).forEach((url) => console.log(`Mobile LAN preview: ${url}`));
    console.log("Mobile camera test: use https://facelympic.vercel.app for HTTPS camera access.");
  });
}

module.exports = { createServer };
