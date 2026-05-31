const fs = require('fs');
const path = require('path');
const https = require('https');

const FIXTURE_DIR = path.join(__dirname, '../fixtures/midjourney');
const ASSETS_DIR = path.join(FIXTURE_DIR, 'index_files');

// ヘルパー: ファイルの存在確認
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// ヘルパー: ディレクトリの作成
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
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
      fs.unlink(destPath, () => {}); // 失敗した場合はファイルを削除
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting Midjourney mock cleanup and localization...');

  if (!fs.existsSync(FIXTURE_DIR)) {
    console.error(`Error: Fixture directory not found at ${FIXTURE_DIR}`);
    process.exit(1);
  }

  ensureDirectoryExists(ASSETS_DIR);

  // 1. ファイルのリネーム
  const renameList = [
    { from: 'clientSideEntry-gnf8cfdk.js.ダウンロード', to: 'clientSideEntry-gnf8cfdk.js' },
    { from: 'css2', to: 'google-fonts.css' },
    // 不要だが残す場合にリネームするものがあれば
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
    } else {
      console.log(`File already renamed or missing: ${item.from}`);
    }
  }

  // 2. HTMLの書き換えと不要依存関係のクリーンアップ
  const htmlPath = path.join(FIXTURE_DIR, 'index.html');
  if (fileExists(htmlPath)) {
    console.log('Processing index.html...');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // a. 不要な外部スクリプトや Turnstile / Analytics / Challenge の削除
    // - <script src="./index_files/api.js.ダウンロード"></script>
    // - <script async="" src="./index_files/js"></script>
    // - <script type="text/javascript" async="" src="./index_files/f.txt"></script>
    // - saved_resource.html 関連の iframe も削除
    
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*api\.js[^"]*"[^>]*><\/script>/gi, '<!-- Cloudflare Turnstile Removed -->');
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*\/index_files\/js[^"]*"[^>]*><\/script>/gi, '<!-- Amplitude Analytics Removed -->');
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*f\.txt[^"]*"[^>]*><\/script>/gi, '<!-- Challenge Platform Removed -->');
    htmlContent = htmlContent.replace(/<iframe[^>]*src="[^"]*saved_resource\.html[^"]*"[^>]*><\/iframe>/gi, '<!-- Saved Resource Iframe Removed -->');
    
    // cdn-cgi チャレンジや存在しない main.js の参照などを削除
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
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('index.html updated.');
  } else {
    console.error('Error: index.html not found.');
    process.exit(1);
  }

  // 3. フォントアセットのダウンロードとローカル化
  const fontsCssPath = path.join(ASSETS_DIR, 'google-fonts.css');
  if (fileExists(fontsCssPath)) {
    console.log('Processing google-fonts.css...');
    let cssContent = fs.readFileSync(fontsCssPath, 'utf8');

    // CSS内の url(https://fonts.gstatic.com/s/...) を抽出
    const urlPattern = /url\((https:\/\/fonts\.gstatic\.com\/s\/[^\)]+)\)/g;
    const urls = [];
    let match;
    while ((match = urlPattern.exec(cssContent)) !== null) {
      urls.push(match[1]);
    }

    console.log(`Found ${urls.length} font files to localize.`);

    for (const url of urls) {
      try {
        // url からファイル名を特定 (最後のスラッシュ以降)
        const urlObj = new URL(url);
        const fileName = path.basename(urlObj.pathname);
        const destPath = path.join(ASSETS_DIR, fileName);

        // 重複ダウンロードを避ける
        if (!fs.existsSync(destPath)) {
          await downloadFile(url, destPath);
        } else {
          console.log(`Font already exists: ${fileName}`);
        }

        // CSS内のフォント参照URLをローカル相対パスに置換
        const escapedUrl = url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const reg = new RegExp(escapedUrl, 'g');
        cssContent = cssContent.replace(reg, `./${fileName}`);
      } catch (err) {
        console.error(`Failed to download or parse font ${url}:`, err);
      }
    }

    // CSSファイルを更新保存
    fs.writeFileSync(fontsCssPath, cssContent, 'utf8');
    console.log('google-fonts.css updated with local paths.');
  } else {
    console.log('google-fonts.css not found, skipping font localization.');
  }

  // 4. Midjourney CSS内の @layer (base|components|utilities) に起因する Vite/PostCSS ビルドエラー対策
  console.log('Patching Midjourney CSS files to prevent PostCSS @layer errors...');
  const cssFiles = fs.readdirSync(ASSETS_DIR).filter(file => file.endsWith('.css') && file.startsWith('clientSideEntry'));
  for (const cssFile of cssFiles) {
    const cssFilePath = path.join(ASSETS_DIR, cssFile);
    let content = fs.readFileSync(cssFilePath, 'utf8');
    const layerRegex = /@layer\s+(base|components|utilities)\b/g;
    if (layerRegex.test(content)) {
      console.log(`Patching @layer layers in ${cssFile}...`);
      content = content.replace(layerRegex, '@layer $1_mock');
      fs.writeFileSync(cssFilePath, content, 'utf8');
    }
  }

  console.log('Cleanup and localization complete!');
}

run().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
