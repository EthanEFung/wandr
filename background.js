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
let broswerTimer;
let fbTimer;

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
  browserTimer = new Timer('browser');
  browserTimer.start();
  fbTimer = new Timer('fb');

  chrome.windows.onCreated.addListener(resumeBrowserTimer);
  chrome.windows.onRemoved.addListener(pauseAll([browserTimer, fbTimer]));

  chrome.tabs.onUpdated.addListener(validateUsage(/facebook/, fbTimer));
  chrome.tabs.onActivated.addListener(updateTimer(/facebook/, fbTimer));

  chrome.storage.onChanged.addListener(updateToolTip);
});

function pauseAll(timers) {
  return function() {
    chrome.windows.getAll({}, function(windows) {
      if (windows.length === 0) {
        timers.forEach(timer => {
          timer.stop();
          timer.save();
        });
      }
    });
  }
}

function resumeBrowserTimer() {
  chrome.windows.getAll({}, function(windows){
    if (windows.length === 1) {
      chrome.storage.local.get('browserTimer', function(result) {
        browserTimer = new Timer('browser', result.browserTimer);
        browserTimer.start();
      });
    }
    const tabs = [];
    windows.forEach((window, i) => {
      chrome.tabs.query({}, function(tabs) {
        console.log(tabs);
      })
    })
  })
}

function updateToolTip() {
  const {hours, minutes, seconds} = browserTimer;
    const time = {
      hours: hours < 10 ? `0${hours}` : hours,
      minutes: minutes < 10 ? `0${minutes}` : minutes,
      seconds: seconds < 10 ? `0${seconds}`: seconds,
    }
    const formattedTime = `${time.hours}:${time.minutes}:${time.seconds}`
    chrome.browserAction.setTitle({
      title: formattedTime
    });
}

function validateUsage(regex, timer) {
  return function (tabId, changedInfo, tab) {
    if (
      changedInfo.status === "complete" &&
      regex.test(tab.url)
    ) {
      chrome.tabs.query({}, function(tabs) {
        if (userStartsBrowsing(regex, tabs)) {
          timer.start();
        }
      });
    }
  }

}

function userStartsBrowsing(regex, tabs) {
  return tabs.filter(tab => regex.test(tab.url)).length === 1;
}

function updateTimer(regex, timer) {
  return function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
      (regex.test(tab.url) && !timer.isActive) ? timer.start() : timer.stop();
    });
  }
}

