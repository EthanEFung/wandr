const timers = {};

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(setTimers);
chrome.runtime.onMessage.addListener(handleExtensionMessages);

function initialize() {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
  addTimer({name: 'browser', domains: ['http', 'chrome', 'https']})
  addTimer({name: 'fb', domains: ['facebook.com']});
  timers.browser.start();
  setBrowserTimerHandlers();
}

function addTimer(timer) {
  setTimer(timer);
  setTimerHandlers(setDomainRegex(timer.domains), timers[timer.name]);
  return timers[timer.name];
}

function setTimer(timerHistory) {
  const timer = new Timer({
    name: timerHistory.name,
    hours: timerHistory.hours || 0,
    minutes: timerHistory.minutes || 0,
    seconds: timerHistory.seconds || 0,
    domains: timerHistory.domains || []
  });
  timer.save();
  timers[timerHistory.name] = timer;
}

function setTimerHandlers(regex, timer) {
  chrome.windows.onFocusChanged.addListener(function(windowId){
    if (windowId === -1) return;
    chrome.windows.get(Number(windowId), {populate: true}, function(window) {
      const {tabs} = window;
      for (let tab of tabs) {
        if (tab.active) {
          if (regex.test(tab.url)) {
            if (!timer.isActive) timer.start();
          } else {
            timer.stop();
          }
        }
      }
    });
  });
  chrome.tabs.onUpdated.addListener(validateUsage(regex, timer));
  chrome.tabs.onActivated.addListener(updateTimer(regex, timer));
}

function setBrowserTimerHandlers() {
  chrome.windows.onRemoved.addListener(pauseAll);
  chrome.storage.onChanged.addListener(updateToolTip);
}

function setTimers() {
  chrome.storage.local.get(null, function(result) {
    for (let timerName in result) {
      setTimer(result[timerName]);
    }
    timers.browser.start();
    setBrowserTimerHandlers();
  });
}

function pauseAll() {
  chrome.windows.getAll({}, function(windows) {
    if (windows.length === 0) {
      timers.forEach(timer => {
        timer.stop();
        timer.save();
      });
    }
  });
}

function updateToolTip() {
  const {hours, minutes, seconds} = timers.browser;
  const time = {
    hours: hours < 10 ? `0${hours}` : "" + hours,
    minutes: minutes < 10 ? `0${minutes}` : "" + minutes,
    seconds: seconds < 10 ? `0${seconds}`: "" + seconds,
  }
  const formattedTime = `Total Browsing Time - ${time.hours}:${time.minutes}:${time.seconds}`
  chrome.browserAction.setTitle({
    title: formattedTime
  });
}

function validateUsage(regex, timer) {
  // console.log('set validate usage for', regex, 'and', timer);
  return function(tabId, changedInfo, tab) {
    changedInfo.status === "complete" &&
    regex.test(tab.url) &&
    !timer.isActive &&
    timer.start();
  }
}

function updateTimer(regex, timer) {
  // console.log('setting update timer handler for', regex, 'and', timer);
  return function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
      if (regex.test(tab.url)) {
        !timer.isActive && timer.start();
      } else {
        timer.stop();
      }
    });
  }
}

function handleExtensionMessages(request, sender, senderResponse) {
  console.log('Action:', request.action);
  switch (request.action) {
    case 'ADD_TIMER' : senderResponse({timer: addTimer(request)});
    default: break;
  }
}

function setDomainRegex(domains) {
  return RegExp(domains.join('|'), 'i');
}
