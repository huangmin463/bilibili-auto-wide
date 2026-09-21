// ==UserScript==
// @name         Bilibili 自动网页全屏
// @namespace    https://bilibili.com/
// @version      1.4
// @description  自动切换到网页全屏模式，通过播放器按钮自动进入（网页全屏=web，宽屏=wide）
// @author       hmyja
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const WEB_BTN_SELECTOR = '.bpx-player-ctrl-web';
  const PLAYER_SELECTOR = '#bilibili-player';

  // ------ 状态检测 ------

  function isAlreadyWeb() {
    const btn = document.querySelector(WEB_BTN_SELECTOR);
    if (!btn) return null;

    // 新版播放器用 bpx-state-entered 标记已进入网页全屏
    if (btn.matches('.bpx-state-entered')) return true;

    // 图标判断：enter 图标存在 → 尚未网页全屏
    if (btn.querySelector('.bpx-player-ctrl-web-enter')) return false;
    // leave 图标存在 → 已在网页全屏
    if (btn.querySelector('.bpx-player-ctrl-web-leave')) return true;

    return null; // 状态不明，不操作
  }

  // ------ 点击 ------

  function tryEnableWeb() {
    const state = isAlreadyWeb();
    if (state === null) return false; // 按钮还没渲染或状态不明
    if (state === true)  return true;  // 已经是网页全屏，目标达成

    const btn = document.querySelector(WEB_BTN_SELECTOR);
    if (btn) btn.click();
    return true;
  }

  // ------ MutationObserver 持续监听 ------

  let playerObserver = null;
  let throttleTimer = null;

  function disconnectPlayerObserver() {
    if (playerObserver) {
      playerObserver.disconnect();
      playerObserver = null;
    }
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
  }

  function startPlayerObserver() {
    const player = document.querySelector(PLAYER_SELECTOR);
    if (!player) {
      setTimeout(startPlayerObserver, 500);
      return;
    }

    if (playerObserver) return;

    playerObserver = new MutationObserver(() => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        const success = tryEnableWeb();
        if (success) {
          disconnectPlayerObserver();
        }
      }, 200);
    });

    playerObserver.observe(player, { childList: true, subtree: true });

    // Also attempt immediately in case player is already fully rendered
    const success = tryEnableWeb();
    if (success) {
      disconnectPlayerObserver();
    }
  }

  // ------ 初始化 ------

  function init() {
    // 首次延迟 2 秒，等播放器完全初始化后再操作
    setTimeout(() => {
      const success = tryEnableWeb();
      if (!success) {
        startPlayerObserver();
      }
    }, 2000);
  }

  // ------ SPA 路由检测 ------

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      disconnectPlayerObserver();
      init();
    }
  }).observe(document.body || document.documentElement, {
    childList: true, subtree: true,
  });

  // ------ 启动 ------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
