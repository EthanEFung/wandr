const _timers = {};
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
    for (let i in result) {
      if (_timers[i]) {
        console.log(_timers);
      } else {
        addTimer(result[i]);
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
      for (let i in _timers) {
        _timers[i].stop();
        _timers[i].save();
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
    tab.active &&
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

function addTimer(history) {
  const timer = new Timer({
    name: history.name,
    hours: history.hours || 0,
    minutes: history.minutes || 0,
    seconds: history.seconds || 0,
    domains: history.domains || []
  });

  setTimer(timer);
  setTimerHandlers(setDomainRegex(timer.domains), _timers[timer.name]);
  return _timers[timer.name];
}

function deleteTimer({timer}) {
  _timers[timer.name].stop();

  chrome.windows.onFocusChanged.removeListener(_eventHandlers[timer.name][0]);
  chrome.tabs.onUpdated.removeListener(_eventHandlers[timer.name][1]);
  chrome.tabs.onActivated.removeListener(_eventHandlers[timer.name][2]);

  delete _timers[timer.name];
  delete _eventHandlers[timer.name];
  chrome.storage.local.remove(timer.name);
  return 'Timer Deleted';
}

function editTimer(history) {
  _timers[history.previousName].stop();
  chrome.storage.local.get(history.previousName, function(response) {
    const previousHistory = response[history.previousName];

    chrome.windows.onFocusChanged.removeListener(_eventHandlers[history.previousName][0]);
    chrome.tabs.onUpdated.removeListener(_eventHandlers[history.previousName][1]);
    chrome.tabs.onActivated.removeListener(_eventHandlers[history.previousName][2]);

    if (history.name === history.previousName) {
      const timer = _timers[history.name]
      timer.domains = history.domains;
      setTimer(timer);
      setTimerHandlers(setDomainRegex(history.domains), timer);
    } else {
      deleteTimer({timer: previousHistory});
      addTimer({
        name: history.name,
        hours: previousHistory.hours,
        minutes: previousHistory.minutes,
        seconds: previousHistory.seconds,
        domains: history.domains
      });
    }
  });
  return _timers[history.name];
}

function setTimer(timer) {
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
  _timers[timer.name] = timer;
}

function updateToolTip() {
  const {hours, minutes, seconds} = _timers.browser;
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

