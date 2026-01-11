export {}

// アクションクリック時にサイドパネルを開く設定
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))