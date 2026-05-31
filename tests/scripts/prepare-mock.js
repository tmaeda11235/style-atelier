const fs = require('fs');
const path = require('path');
const https = require('https');

const FIXTURE_DIR = path.join(__dirname, '../fixtures/midjourney');
const ORIGINAL_DIR = path.join(FIXTURE_DIR, 'original');
const ORIGINAL_ASSETS = path.join(ORIGINAL_DIR, 'index_files');
const ASSETS_DIR = path.join(FIXTURE_DIR, 'index_files');

// ヘルパー: ディレクトリ削除
function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// ヘルパー: ディレクトリコピー
function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((file) => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// ヘルパー: ファイルの存在確認
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// ヘルパー: ファイルのダウンロード
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url} -> ${destPath}`);
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: Status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting Midjourney mock cleanup and localization (Pristine CSS Restore)...');

  // 1. original ディレクトリから pristine (初期状態) ファイルを復元
  if (!fs.existsSync(ORIGINAL_DIR)) {
    console.error(`Error: Original files directory not found at ${ORIGINAL_DIR}`);
    process.exit(1);
  }

  console.log('Restoring pristine files from original/ directory...');
  
  // 旧ファイルのクリーンアップ
  deleteFolderRecursive(ASSETS_DIR);
  const targetHtml = path.join(FIXTURE_DIR, 'index.html');
  if (fs.existsSync(targetHtml)) {
    fs.unlinkSync(targetHtml);
  }

  // オリジナルからコピー
  copyFolderRecursive(ORIGINAL_ASSETS, ASSETS_DIR);
  fs.copyFileSync(path.join(ORIGINAL_DIR, 'index.html'), targetHtml);

  // 2. ファイルのリネーム
  const renameList = [
    { from: 'clientSideEntry-gnf8cfdk.js.ダウンロード', to: 'clientSideEntry-gnf8cfdk.js' },
    { from: 'css2', to: 'google-fonts.css' },
  ];

  for (const item of renameList) {
    const fromPath = path.join(ASSETS_DIR, item.from);
    const toPath = path.join(ASSETS_DIR, item.to);
    if (fileExists(fromPath)) {
      console.log(`Renaming: ${item.from} -> ${item.to}`);
      if (fs.existsSync(toPath)) {
        fs.unlinkSync(toPath);
      }
      fs.renameSync(fromPath, toPath);
    }
  }

  // 3. HTMLの書き換えと不要依存関係のクリーンアップ
  if (fileExists(targetHtml)) {
    console.log('Processing index.html...');
    let htmlContent = fs.readFileSync(targetHtml, 'utf8');

    // a. 不要な外部スクリプトや Turnstile / Analytics / Challenge の削除
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*api\.js[^"]*"[^>]*><\/script>/gi, '<!-- Cloudflare Turnstile Removed -->');
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*\/index_files\/js[^"]*"[^>]*><\/script>/gi, '<!-- Amplitude Analytics Removed -->');
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*f\.txt[^"]*"[^>]*><\/script>/gi, '<!-- Challenge Platform Removed -->');
    htmlContent = htmlContent.replace(/<iframe[^>]*src="[^"]*saved_resource\.html[^"]*"[^>]*><\/iframe>/gi, '<!-- Saved Resource Iframe Removed -->');
    
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*cdn-cgi[^"]*"[^>]*><\/script>/gi, '');
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*main\.js[^"]*"[^>]*><\/script>/gi, '');

    // b. リネームしたアセットのパス修正
    htmlContent = htmlContent.replace(/href="[^"]*\/index_files\/css2"/g, 'href="./index_files/google-fonts.css"');
    
    // clientSideEntry.js (React エントリ) を無効化して、React ハイドレーションによる静的HTML/画像の初期化（CORSエラーによる消去）を防ぐ
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*clientSideEntry-gnf8cfdk[^"]*"[^>]*><\/script>/gi, '<!-- clientSideEntry Disabled to preserve static HTML/Images -->');

    // content.ts スクリプトのインジェクト (もし未インジェクトなら)
    if (!htmlContent.includes('/tests/sandbox/content.ts')) {
      htmlContent = htmlContent.replace('</body>', '<script type="module" src="/tests/sandbox/content.ts"></script>\n</body>');
    }

    // c. 保存
    fs.writeFileSync(targetHtml, htmlContent, 'utf8');
    console.log('index.html updated.');
  }

  // 4. フォントアセットのダウンロードとローカル化
  const fontsCssPath = path.join(ASSETS_DIR, 'google-fonts.css');
  if (fileExists(fontsCssPath)) {
    console.log('Processing google-fonts.css...');
    let cssContent = fs.readFileSync(fontsCssPath, 'utf8');

    const urlPattern = /url\((https:\/\/fonts\.gstatic\.com\/s\/[^\)]+)\)/g;
    const urls = [];
    let match;
    while ((match = urlPattern.exec(cssContent)) !== null) {
      urls.push(match[1]);
    }

    console.log(`Found ${urls.length} font files to localize.`);

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const fileName = path.basename(urlObj.pathname);
        const destPath = path.join(ASSETS_DIR, fileName);

        if (!fs.existsSync(destPath)) {
          await downloadFile(url, destPath);
        }

        const escapedUrl = url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const reg = new RegExp(escapedUrl, 'g');
        cssContent = cssContent.replace(reg, `./${fileName}`);
      } catch (err) {
        console.error(`Failed to download or parse font ${url}:`, err);
      }
    }

    fs.writeFileSync(fontsCssPath, cssContent, 'utf8');
    console.log('google-fonts.css updated with local paths.');
  }

  // 【重要】 clientSideEntry-*.css は一切書き換えません（元来のレスポンシブデザイン・優先順位を保証）
  console.log('Midjourney layout CSS is preserved in its original form.');
  console.log('Cleanup and localization complete!');
}

run().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
