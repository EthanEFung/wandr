class Timer {
  constructor(
    name, 
    state={
      hours: 0,
      minutes: 0,
      seconds: 0
    }
  ) {
    this.name = name;
    this.hours = state.hours;
    this.minutes = state.minutes;
    this.seconds = state.seconds;
    this.isActive = false;
    this.interval;
  }
  save(){
    chrome.storage.local.set({
      [this.name + 'Timer'] : {
        hours: this.hours,
        minutes: this.minutes,
        seconds: this.seconds
      }
    });
  }
  start() {
    this.isActive = true;
    this.interval = setInterval(() => {
      this.seconds++;
      if (this.seconds >= 60) {
        this.seconds = 0;
        this.minutes++;
      }
      if (this.minutes >= 60) {
        this.minutes = 0;
        this.hours++;
      }
      if (this.seconds % 2 === 0) this.save()
    }, 1000);
  }
  stop() {
    this.isActive = false;
    clearInterval(this.interval);
  }
}

// timers
let browserTimer;
let fbTimer;

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(setTimers);

function initialize() {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
  browserTimer = new Timer('browser');
  fbTimer = new Timer('fb');
  setHandlers();
  browserTimer.start();
}

function setTimers(){
  chrome.storage.local.get(['browserTimer', 'fbTimer'], function(result){
    browserTimer = new Timer('browser', {
      hours: result.browserTimer.hours,
      minutes: result.browserTimer.minutes,
      seconds: result.browserTimer.seconds
    });
    if (result.fbTimer) {
      fbTimer = new Timer('fb', {
        hours: result.fbTimer.hours,
        minutes: result.fbTimer.minutes,
        seconds: result.fbTimer.seconds
      });
    } else {
      fbTimer = new Timer('fb');
    }
    setHandlers();
    browserTimer.start();
  });
}

function setHandlers() {
  chrome.windows.onCreated.addListener(resumeBrowserTimer);
  chrome.windows.onRemoved.addListener(pauseAll);

  chrome.tabs.onUpdated.addListener(validateUsage(/facebook/, fbTimer));
  chrome.tabs.onActivated.addListener(updateTimer(/facebook/, fbTimer));

  chrome.storage.onChanged.addListener(updateToolTip);
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

