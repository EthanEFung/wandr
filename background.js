// timers
let browserTimer;
let fbTimer;

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(setTimers);
chrome.runtime.onStartup.addListener(startBrowserTimer);

function initialize() {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
  setTimers();
  startBrowserTimer();
}

function setTimers(){
  chrome.storage.local.get(['browserTimer', 'fbTimer'], function(result){
    browserTimer = setTimer('browser', result.browserTimer);
    fbTimer = setTimer('fb', result.fbTimer);
    setBrowserTimerHandlers();
    setTimerHandlers(/facebook/, fbTimer);
  });
}

function setTimer(name, timerHistory=false) {
  if (timerHistory) {
    return new Timer(name, {
      hours: timerHistory.hours,
      minutes: timerHistory.minutes,
      seconds: timerHistory.seconds
    });
  } else {
    return new Timer(name);
  }
}

function setBrowserTimerHandlers() {
  chrome.windows.onCreated.addListener(resumeBrowserTimer);
  chrome.windows.onRemoved.addListener(pauseAll);
  chrome.storage.onChanged.addListener(updateToolTip);
}

function setTimerHandlers(regex, timer) {
  chrome.tabs.onUpdated.addListener(validateUsage(regex, timer));
  chrome.tabs.onActivated.addListener(updateTimer(regex, timer));
}

function startBrowserTimer(){
  const listener = setInterval(function() {
    if (browserTimer) {
      browserTimer.start();
      clearInterval(listener); 
    }
  }, 0);
}

function pauseAll() {
  const timers = [browserTimer, fbTimer];
  chrome.windows.getAll({}, function(windows) {
    if (windows.length === 0) {
      timers.forEach(timer => {
        timer.stop();
        timer.save();
      });
    }
  });
}

function resumeBrowserTimer() {
  chrome.windows.getAll({}, function(windows){
    if (windows.length === 1) {
      chrome.storage.local.get('browserTimer', function(result) {
        browserTimer = new Timer('browser', result.browserTimer);
        browserTimer.start();
      });
    }
  });
}

function updateToolTip() {
  const {hours, minutes, seconds} = browserTimer;
  const time = {
    hours: hours < 10 ? `0${hours}` : "" + hours,
    minutes: minutes < 10 ? `0${minutes}` : "" + minutes,
    seconds: seconds < 10 ? `0${seconds}`: "" + seconds,
  }
  const formattedTime = `${time.hours}:${time.minutes}:${time.seconds}`
  chrome.browserAction.setTitle({
    title: formattedTime
  });
}

function validateUsage(regex, timer) {
  return function(tabId, changedInfo, tab) {
    changedInfo.status === "complete" &&
    regex.test(tab.url) &&
    !timer.isActive &&
    timer.start();
  }
}

function updateTimer(regex, timer) {
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

