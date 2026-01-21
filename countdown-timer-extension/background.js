// 监听 Service Worker 安装
self.addEventListener('install', () => {
  console.log('Service Worker installed');
});

// 监听 Service Worker 激活
self.addEventListener('activate', () => {
  console.log('Service Worker activated');
});

// 透明 1x1 像素占位符 (极简，确保不会出错)
const TRANSPARENT_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name); 

  if (alarm.name === 'countdownTimer') {
    const notificationId = `timer-finished-${Date.now()}`;
    
    // 播放通知
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: TRANSPARENT_ICON,
      title: '🍃 树叶倒计时', // 完全依靠 Emoji 传递视觉信息
      message: '时间到！该喝水了！'
    }, (createdId) => {
      if (chrome.runtime.lastError) {
        console.error('Notification error:', chrome.runtime.lastError);
      } else {
        console.log('Notification created with ID:', createdId);
      }
    });

    // 清理 storage
    chrome.storage.local.remove(['targetTime'], () => {
      console.log('Storage cleared');
    });
  }
});