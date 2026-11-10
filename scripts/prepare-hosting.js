const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const hostingDir = path.join(root, ".firebase", "np-junction", "hosting");
const nextDir = path.join(root, ".next");
const publicDir = path.join(root, "public");

// 1. Ensure hosting directory exists
fs.mkdirSync(hostingDir, { recursive: true });

// 2. Copy public directory contents
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, hostingDir, { recursive: true });
}

// 3. Copy .next/static to .firebase/np-junction/hosting/_next/static
const nextStaticDir = path.join(nextDir, "static");
const targetStaticDir = path.join(hostingDir, "_next", "static");
if (fs.existsSync(nextStaticDir)) {
  fs.mkdirSync(targetStaticDir, { recursive: true });
  fs.cpSync(nextStaticDir, targetStaticDir, { recursive: true });
}

// 4. Copy all HTML and page assets from .next/server/app to hosting directory
const serverAppDir = path.join(nextDir, "server", "app");
function copyHtmlFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyHtmlFiles(srcPath, destPath);
    } else if (entry.name.endsWith(".html") || entry.name.endsWith(".rsc")) {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyHtmlFiles(serverAppDir, hostingDir);

// 5. Ensure index.html and 404.html are present
const pageHtml = path.join(serverAppDir, "index.html");
const notFoundHtml = path.join(serverAppDir, "_not-found.html");
if (!fs.existsSync(path.join(hostingDir, "404.html")) && fs.existsSync(notFoundHtml)) {
  fs.copyFileSync(notFoundHtml, path.join(hostingDir, "404.html"));
}

console.log("Successfully prepared .firebase/np-junction/hosting for deployment.");
