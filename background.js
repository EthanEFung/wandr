const _timers = {};
const _eventHandlers = {};
const _alarmResetHour = new Date();

chrome.runtime.onInstalled.addListener(handleOnInstalled);
chrome.runtime.onStartup.addListener(handleOnStartup);
chrome.runtime.onMessage.addListener(handleExtensionMessages);
chrome.alarms.onAlarm.addListener(handleResetTimersOnAlarm);
chrome.idle.setDetectionInterval(15)
chrome.idle.onStateChanged.addListener(function(newState) {
  console.log('state', newState)
  if (newState === 'idle' || newState === 'locked') {
    console.log('timers', _timers);
    for (let i in _timers) {
      const t = _timers[i];
      t.stop();
    }
  } else {

    
    chrome.windows.getAll({populate:true}, function(windows) {
      for (let window of windows) {
        window.tabs.forEach(tab => {
          if (tab.active) {
            console.log('for active tab', tab)
            for (let i in _timers) {
              const domains = setDomainRegex(_timers[i].domains);
              if (domains.test(tab.url) && !_timers[i].isActive) {
                _timers[i].start();
              }
            }
          }
        })
      }
    });
  }
})

function setBrowserTimerHandlers() {
  _eventHandlers.browser = [
    handleWindowRemove, 
    updateToolTip
  ];

  if (chrome.windows.onRemoved.hasListener(handleWindowRemove)) {
    chrome.windows.onRemoved.removeListener(handleWindowRemove);
  }
  if (chrome.storage.onChanged.hasListener(updateToolTip)) {
    chrome.storage.onChanged.removeListener(updateToolTip);
  }
  chrome.windows.onRemoved.addListener(handleWindowRemove);
  chrome.storage.onChanged.addListener(updateToolTip);
}
 
function setTimerHandlers(regex, timer) {
  if (timer.name === 'browser') return;
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
  chrome.alarms.clearAll(function(wasCleared) {
    console.log('cleared alarms:', wasCleared);

    const now = new Date(Date.now());
    _alarmResetHour.setMinutes(now.getMinutes());
    chrome.alarms.create('resetTimersAlarm', {
      when: _alarmResetHour.getTime()
    });
  });
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
  const responseMap = {
    'ADD_TIMER': () => ({timer: addTimer(request)}),
    'DELETE_TIMER': () => deleteTimer(request),
    'EDIT_TIMER': () => ({timer: editTimer(request)}),
    'RESET_TIMERS': () => resetTimers(request),
    'TEXT_TIMERS_REPORT': generateReport
  }
  return senderResponse(responseMap[request.action]());
}

function handleResetTimersOnAlarm(alarm) {
  const resetTimersAlarmName = 'resetTimersAlarm';
  if (alarm.name === resetTimersAlarmName) {
    // <-- uncomment following lines and comment out 24 hour set for debugging -->
    // const now = new Date(Date.now());
    // _alarmResetHour.setHours(
    //   now.getHours(), now.getMinutes(), now.getSeconds() + 30, 0);
    _alarmResetHour.setHours(25,0,0,0);
    chrome.alarms.clear(resetTimersAlarmName, 
      function() {
        chrome.alarms.create(resetTimersAlarmName, {
          when: _alarmResetHour.getTime()
        });
        chrome.alarms.get(resetTimersAlarmName, function(alarm) {
          const time = new Date(alarm.scheduledTime);
          console.log('Next timers reset scheduled for:\n', time);
        });
      }
    );
    // generateReport();
    resetTimers();
  }
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

  chrome.storage.local.remove(timer.name);
  chrome.windows.onFocusChanged.removeListener(_eventHandlers[timer.name][0]);
  chrome.tabs.onUpdated.removeListener(_eventHandlers[timer.name][1]);
  chrome.tabs.onActivated.removeListener(_eventHandlers[timer.name][2]);

  delete _timers[timer.name];
  delete _eventHandlers[timer.name];
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

function generateReport() {
  chrome.storage.local.get(null, function(response) {
    fetch("https://brass-cobra-9941.twil.io/sendWandr", {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(response), // body data type must match "Content-Type" header
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(err => err);
  });
}

function resetTimers() {
  for (let i in _timers) {
    const t = _timers[i];
    t.stop();
    deleteTimer({timer: t});
    if (t.name === 'browser') setBrowserTimerHandlers();
    addTimer({name: t.name, domains: t.domains});
  }
  return 'Timers Reset'
}

function setDomainRegex(domains) {
  return RegExp(domains.join('|'), 'i');
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
  const formattedTime = 
    `Total Browsing Time - ${time.hours}:${time.minutes}:${time.seconds}`
  chrome.browserAction.setTitle({
    title: formattedTime
  });
}

