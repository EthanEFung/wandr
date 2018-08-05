const timers = {};

chrome.runtime.onInstalled.addListener(handleOnInstalled);
chrome.runtime.onStartup.addListener(handleOnStartup);
chrome.runtime.onMessage.addListener(handleExtensionMessages);

function setBrowserTimerHandlers() {
  chrome.windows.onRemoved.addListener(handleWindowRemove);
  chrome.storage.onChanged.addListener(updateToolTip);
}
 
function setTimerHandlers(regex, timer) {
  chrome.windows.onFocusChanged.addListener(handleWindowChange(regex, timer));
  chrome.tabs.onUpdated.addListener(handleUpdatedTab(regex, timer));
  chrome.tabs.onActivated.addListener(handleActiveTab(regex, timer));
}

function handleOnInstalled() {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
  addTimer({name: 'browser', domains: ['http', 'chrome', 'https']})
  addTimer({name: 'fb', domains: ['facebook.com']});
  setBrowserTimerHandlers();
}

function handleOnStartup() {
  chrome.storage.local.get(null, function(result) {
    for (let timerName in result) {
      if (timers[timerName]) {
        console.log(timers);
        
      } else {
        addTimer(result[timerName]);
      }
    }
    setBrowserTimerHandlers();
  });
}

function handleExtensionMessages(request, sender, senderResponse) {
  console.log('Action:', request.action);
  switch (request.action) {
    case 'ADD_TIMER' : senderResponse({timer: addTimer(request)});
    default: break;
  }
}

function handleWindowRemove() {
  chrome.windows.getAll({}, function(windows) {
    if (windows.length === 0) {
      for (let i in timers) {
        timers[i].stop();
        timers[i].save();
      }
    }
  });
}

function handleWindowChange(regex, timer) {
  return function(windowId){
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
  }
}

function handleUpdatedTab(regex, timer) {
  return function(tabId, changedInfo, tab) {
    changedInfo.status === "complete" &&
    regex.test(tab.url) &&
    !timer.isActive &&
    timer.start();
  }
}

function handleActiveTab(regex, timer) {
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
  chrome.windows.getCurrent({populate:true}, function(window) {
    window.tabs.forEach(tab => {
      if (
        tab.active && 
        setDomainRegex(timer.domains).test(tab.url) &&
        !timer.isActive
      ) {
        timer.start();
      }
    });
  })
  timers[timerHistory.name] = timer;
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

function setDomainRegex(domains) {
  return RegExp(domains.join('|'), 'i');
}

