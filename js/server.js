// Import required modules for HTTP server, file system operations, and path utilities
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create an HTTP server that serves files based on URL requests
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = 'home.html';

    // Determine file extension to set appropriate content type
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
    };

    // Get content type based on file extension or default to binary stream
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read requested file and return its contents or 404 if not found
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Start the server on port 3000 and display a confirmation message
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});