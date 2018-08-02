const timerSelectors = ['browserTimer', 'fbTimer'];

document.addEventListener('DOMContentLoaded', renderPopup);
chrome.storage.onChanged.addListener(renderPopup);
chrome.browserAction.onClicked.addListener(renderPopup);

function renderPopup() {
  chrome.storage.local.get(null, function(result) {
    timerSelectors.forEach($timer => renderTimer($timer, result));
  });
}

function renderTimer(selector, result) {
  let hours = minutes = seconds = 0;
  if (result[selector]) {
    hours = result[selector].hours;
    minutes = result[selector].minutes;
    seconds = result[selector].seconds;
  }
  const time = {
    hours: hours < 10 ? `0${hours}` : hours,
    minutes: minutes < 10 ? `0${minutes}` : minutes,
    seconds: seconds < 10 ? `0${seconds}`: seconds,
  };
  document.getElementById(selector).textContent = 
    `${time.hours}:${time.minutes}:${time.seconds}`;
}
