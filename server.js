const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function createServer() {
  return http.createServer((request, response) => {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const filePath = path.join(root, decodeURIComponent(requestedPath.split("?")[0]));

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

if (require.main === module) {
  const port = process.env.PORT || 5173;
  const server = createServer();

  server.listen(port, () => {
    console.log(`Facelympic MVP running at http://localhost:${port}`);
  });
}

module.exports = { createServer };
