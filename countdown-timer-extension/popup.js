document.addEventListener('DOMContentLoaded', () => {
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const loopTimerCheckbox = document.getElementById('loop-timer');
  const startBtn = document.getElementById('start-btn');
  const resetBtn = document.getElementById('reset-btn');
  const setupView = document.getElementById('setup-view');
  const timerView = document.getElementById('timer-view');
  const timeDisplay = document.getElementById('time-display');

  let updateInterval;

  // 监听 Storage 变化 (处理循环计时的 UI 更新)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.targetTime && changes.targetTime.newValue) {
      const now = Date.now();
      // 如果有新的 targetTime 且大于当前时间，说明开始了新一轮循环
      if (changes.targetTime.newValue > now) {
        // 如果当前还在 setupView (比如刚结束)，切换到 timerView
        if (!setupView.classList.contains('hidden')) {
           showTimerView();
        }
        startUIUpdate(changes.targetTime.newValue);
      }
    }
  });

  // 检查当前状态，并恢复上次的设置
  chrome.storage.local.get(['targetTime', 'lastMinutes', 'lastSeconds', 'isLoop'], (result) => {
    // 恢复上次设置的时间和循环状态
    if (result.lastMinutes !== undefined) minutesInput.value = result.lastMinutes;
    if (result.lastSeconds !== undefined) secondsInput.value = result.lastSeconds;
    if (result.isLoop !== undefined) loopTimerCheckbox.checked = result.isLoop;

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
    const isLoop = loopTimerCheckbox.checked;

    if (mins === 0 && secs === 0) return;

    // 保存当前设置，方便下次使用
    chrome.storage.local.set({ 
      lastMinutes: mins, 
      lastSeconds: secs,
      isLoop: isLoop
    });

    const durationInSeconds = mins * 60 + secs;
    // 加上 100 毫秒缓冲，确保 alarm 触发时 diff 肯定是 <= 0
    const targetTime = Date.now() + durationInSeconds * 1000;

    // 保存目标时间、倒计时时长(用于循环)和循环状态
    chrome.storage.local.set({ 
      targetTime: targetTime,
      duration: durationInSeconds,
      isLoop: isLoop
    }, () => {
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
      // 清除 targetTime 和循环相关的设置，停止循环
      chrome.storage.local.remove(['targetTime', 'duration', 'isLoop'], () => {
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
    chrome.storage.local.get(['lastMinutes', 'lastSeconds', 'isLoop'], (result) => {
      if (result.lastMinutes !== undefined) minutesInput.value = result.lastMinutes;
      if (result.lastSeconds !== undefined) secondsInput.value = result.lastSeconds;
      // 注意：这里我们可能不需要恢复 checkbox 状态为上次运行时的状态，或者保持一致
      // 用户刚点击取消，通常希望看到之前的设置状态，包括循环是否选中
      // 但上面的 remove 移除了 isLoop (用于控制后台循环的)，而 last... 中的 isLoop 是用于 UI 恢复的
      // 这里应该读取 lastMinutes 等，因为 resetBtn 的 remove 删除了运行时的 isLoop
      // 我们在 startBtn 点击时保存了 isLoop 到 last... 中吗？是的。
      // 但是我们在 startBtn 也保存了 isLoop 到运行时的 key 中。
      // resetBtn 移除了 isLoop，所以这里重新读取 last... 恢复 UI 是对的。
      if (result.isLoop !== undefined) loopTimerCheckbox.checked = result.isLoop;
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