import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = 5000;
const DIST_DIR = './dist';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  // 去除查询字符串并解码 URL 编码（支持中文文件名）
  let urlPath = req.url?.split('?')[0] || '/';
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch (e) {
    // 解码失败时使用原始路径
  }
  let filePath = join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  // 如果文件不存在，返回 index.html (SPA 支持)
  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html');
  }
  
  const ext = extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
});
