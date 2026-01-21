document.addEventListener('DOMContentLoaded', () => {
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const startBtn = document.getElementById('start-btn');
  const resetBtn = document.getElementById('reset-btn');
  const setupView = document.getElementById('setup-view');
  const timerView = document.getElementById('timer-view');
  const timeDisplay = document.getElementById('time-display');

  let updateInterval;

  // 检查当前状态，并恢复上次的设置
  chrome.storage.local.get(['targetTime', 'lastMinutes', 'lastSeconds'], (result) => {
    // 恢复上次设置的时间
    if (result.lastMinutes !== undefined) minutesInput.value = result.lastMinutes;
    if (result.lastSeconds !== undefined) secondsInput.value = result.lastSeconds;

    if (result.targetTime) {
      const now = Date.now();
      if (result.targetTime > now) {
        showTimerView();
        startUIUpdate(result.targetTime);
      } else {
        // 已经过期，清理（虽然 background 也会清理，但防止 UI 滞后）
        chrome.storage.local.remove(['targetTime']);
      }
    }
  });

  startBtn.addEventListener('click', () => {
    const mins = parseInt(minutesInput.value) || 0;
    const secs = parseInt(secondsInput.value) || 0;

    if (mins === 0 && secs === 0) return;

    // 保存当前设置，方便下次使用
    chrome.storage.local.set({ 
      lastMinutes: mins, 
      lastSeconds: secs 
    });

    const durationInSeconds = mins * 60 + secs;
    // 加上 100 毫秒缓冲，确保 alarm 触发时 diff 肯定是 <= 0
    const targetTime = Date.now() + durationInSeconds * 1000;

    // 保存目标时间
    chrome.storage.local.set({ targetTime: targetTime }, () => {
      // 创建 Alarm
      chrome.alarms.create('countdownTimer', {
        when: targetTime
      });
      console.log('Alarm created for:', new Date(targetTime).toLocaleString());
      
      showTimerView();
      startUIUpdate(targetTime);
    });
  });

  resetBtn.addEventListener('click', () => {
    chrome.alarms.clear('countdownTimer', () => {
      chrome.storage.local.remove(['targetTime'], () => {
        if (updateInterval) clearInterval(updateInterval);
        showSetupView();
      });
    });
  });

  function showTimerView() {
    setupView.classList.add('hidden');
    timerView.classList.remove('hidden');
  }

  function showSetupView() {
    timerView.classList.add('hidden');
    setupView.classList.remove('hidden');
    timeDisplay.textContent = "00:00";
    
    // 恢复上次设置的值 (从 input 当前值或 storage 读取)
    // 此时 input 的值可能还在，或者重新从 storage 读一次确保一致性
    chrome.storage.local.get(['lastMinutes', 'lastSeconds'], (result) => {
      if (result.lastMinutes !== undefined) minutesInput.value = result.lastMinutes;
      if (result.lastSeconds !== undefined) secondsInput.value = result.lastSeconds;
    });
  }

  function startUIUpdate(targetTime) {
    // 立即更新一次
    updateDisplay(targetTime);
    
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      updateDisplay(targetTime);
    }, 1000);
  }

  function updateDisplay(targetTime) {
    const now = Date.now();
    const diff = Math.ceil((targetTime - now) / 1000);

    if (diff <= 0) {
      if (updateInterval) clearInterval(updateInterval);
      timeDisplay.textContent = "时间到!";
      // 可以在几秒后自动重置，或者让用户手动重置
      return;
    }

    const m = Math.floor(diff / 60);
    const s = diff % 60;
    timeDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
});