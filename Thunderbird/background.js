async function setupContextMenu() {
  messenger.menus.removeAll();
  messenger.menus.create({
    "id": "menuDeepLWrite",
    "title": messenger.i18n.getMessage("menuItem"),
    "contexts": ["selection"]
  }, () => {
    if (browser.runtime.lastError) {
      console.error(`DeepL-Write: ${browser.runtime.lastError}`);
    }
  });
}

browser.runtime.onInstalled.addListener(details => {
  if (details.reason == "install") {
    const defaultSettings = {
      "target": "tab",
    };
    messenger.storage.local.set(defaultSettings, () => {
      if (browser.runtime.lastError) {
          console.error(browser.runtime.lastError);
      }
    });
    setupContextMenu();
  }
});

async function goDeepLWrite(text, allowReload = true)
{
  const result = await messenger.storage.local.get(['target', 'width', 'height']);

  const escapedText = text.replace(/\\/g, '\\\\')
                          .replace(/\//g, '\\/')
                          .replace(/\|/g, '\\|');

  const url = 'https://www.deepl.com/write#en/' + encodeURIComponent(escapedText);
  //console.log(url);

  // Wait for the page load in the opened tab/window to trigger a reload if needed.
  let status = await new Promise(async resolve => {
    let tabId;
    let listener = async details => {
      //console.log("Received tabId", details.tabId);
      if (details.tabId != tabId) {
        return;
      }
      let releaseGroups = await messenger.cookies.get({ name: "releaseGroups", url: "https://www.deepl.com" });
      if (releaseGroups == null) {
        messenger.webNavigation.onCompleted.removeListener(listener);
        resolve({ tabId, needsReload: false });
        return;
      }
      // We have to delete this cookie and re-request due to the DeepL translator bug.
      await messenger.cookies.remove({ name: "releaseGroups", url: "https://www.deepl.com" });
      messenger.webNavigation.onCompleted.removeListener(listener);
      resolve({ tabId, needsReload: true });
    }
    messenger.webNavigation.onCompleted.addListener(listener);

    switch (result.target) {
    case "window":
      let window = await messenger.windows.create({ url: url, type: "popup", width: Number(result.width), height: Number(result.height) });
      let { tabs } = await browser.windows.get(window.id, { populate: true });
      tabId = tabs[0].id;
      break;
    case "tabs":
    default:
      let tab = await messenger.tabs.create({ 'url': url });
      tabId = tab.id;
      break;
    }
    //console.log("Created tabId:", tabId);
  })

  if (status.needsReload && allowReload) {
    console.log("Needs Reload");
    let { version } = await browser.runtime.getBrowserInfo();
    let majorVersion = parseInt(version.split(".").shift());
    if (result.target == "window" && majorVersion < 115) {
      messenger.tabs.remove(status.tabId);
      // Prevent endless loops by not allowing closing and re-opening a second time.
      await goDeepLWrite(text, false);
    } else {
      messenger.tabs.reload(status.tabId);
    }
  }

}

messenger.menus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
  case "menuDeepLWrite":
    goDeepLWrite(info.selectionText);
    break;
  }
});
