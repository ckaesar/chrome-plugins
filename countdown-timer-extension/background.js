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

    // 检查是否需要循环
    chrome.storage.local.get(['isLoop', 'duration'], (result) => {
      if (result.isLoop && result.duration) {
        // 循环模式：设置下一轮倒计时
        const nextTargetTime = Date.now() + result.duration * 1000;
        
        chrome.storage.local.set({ targetTime: nextTargetTime }, () => {
          chrome.alarms.create('countdownTimer', {
            when: nextTargetTime
          });
          console.log('Looping: next alarm set for', new Date(nextTargetTime).toLocaleString());
        });
      } else {
        // 非循环模式：清理 storage
        chrome.storage.local.remove(['targetTime', 'duration', 'isLoop'], () => {
          console.log('Storage cleared (not looping)');
        });
      }
    });
  }
});