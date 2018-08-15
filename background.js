const timers = {};
const _eventHandlers = {};

chrome.runtime.onInstalled.addListener(handleOnInstalled);
chrome.runtime.onStartup.addListener(handleOnStartup);
chrome.runtime.onMessage.addListener(handleExtensionMessages);

function setBrowserTimerHandlers() {
  _eventHandlers.browser = [handleWindowRemove, updateToolTip];
  chrome.windows.onRemoved.addListener(handleWindowRemove);
  chrome.storage.onChanged.addListener(updateToolTip);
}
 
function setTimerHandlers(regex, timer) {
  _eventHandlers[timer.name] = [
    handleWindowChange(regex, timer), 
    handleUpdatedTab(regex, timer),
    handleActiveTab(regex, timer)
  ];
  chrome.windows.onFocusChanged.addListener(_eventHandlers[timer.name][0]);
  chrome.tabs.onUpdated.addListener(_eventHandlers[timer.name][1]);
  chrome.tabs.onActivated.addListener(_eventHandlers[timer.name][2]);
}

function handleOnInstalled() {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
  addTimer({name: 'browser', domains: ['http', 'chrome', 'https']})
  addTimer({name: 'facebook', domains: ['facebook.com']});
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
  let response;
  switch (request.action) {
    case 'ADD_TIMER': 
      response = {timer: addTimer(request)};
      break;
    case 'DELETE_TIMER': 
      response = deleteTimer(request);
      break;
    case 'EDIT_TIMER':
      response = {timer: editTimer(request)};
      break;
    default:
      response = 'NO_ACTION';
  }
  return senderResponse(response);
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

function deleteTimer({timer}) {
  chrome.storage.local.remove(timer.name);
  delete timers[timer.name];
  return 'Timer Deleted';
}

function editTimer(timer) {
  console.log('edit timer with new results', timer);
  chrome.storage.local.get(timer.previousName, function(response) {
    const previousTimer = response[timer.previousName];

    chrome.windows.onFocusChanged.removeListener(_eventHandlers[timer.previousName][0]);
    chrome.tabs.onUpdated.removeListener(_eventHandlers[timer.previousName][1]);
    chrome.tabs.onActivated.removeListener(_eventHandlers[timer.previousName][2]);

    if (timer.name === timer.previousName) {
      timers[timer.name].domains = timer.domains;
      timers[timer.name].save();
      setTimerHandlers(setDomainRegex(timer.domains), timers[timer.name]);
    } else {
      deleteTimer({timer: previousTimer});
      addTimer({
        name: timer.name,
        hours: previousTimer.hours,
        minutes: previousTimer.minutes,
        seconds: previousTimer.seconds,
        domains: timer.domains
      });
    }
  });
  return timer;
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
  });
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

