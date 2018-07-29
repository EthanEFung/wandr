const SECONDS_IN_A_DAY = 24 * 60 * 60;
const SECONDS_IN_AN_AVERAGE_WORK_DAY = 8 * 60 * 60;
const $submit = document.querySelector('button[type="submit"]');
const $input = document.querySelector('input');

document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get('browserTimer', renderBrowserTimer);
});

chrome.storage.onChanged.addListener(renderPopup);
chrome.browserAction.onClicked.addListener(renderPopup);
$submit.addEventListener('click', submitDomain);
document.addEventListener('keyup', e => e.key === 'Enter' && submitDomain(e));



function renderPopup() {
  chrome.storage.local.get(['browserTimer', 'fbTimer'], function(result) {
    renderBrowserTimer(result)
    renderFbTimer(result);
  });
}

function renderBrowserTimer(result) {
  const {hours, minutes, seconds} = result.browserTimer;
  const time = {
    hours: hours < 10 ? `0${hours}` : hours,
    minutes: minutes < 10 ? `0${minutes}` : minutes,
    seconds: seconds < 10 ? `0${seconds}`: seconds,
  }
  document.getElementById('time').textContent = `${time.hours}:${time.minutes}:${time.seconds}`;

  const hoursToSeconds = 60 * 60 * hours;
  const minutesToSeconds = 60 * minutes;
  const totalSeconds = hoursToSeconds + minutesToSeconds + seconds;
  const fraction = parseInt(totalSeconds/SECONDS_IN_AN_AVERAGE_WORK_DAY*100);

  document.getElementById('fraction').textContent = 
    `${fraction}% of your work day`;
}

function renderFbTimer(result){
  let hours =  minutes = seconds = 0;
  if (result.fbTimer) {
    const {fbTimer} = result;
    hours = fbTimer.hours;
    minutes = fbTimer.minutes;
    seconds = fbTimer.seconds;
  }
  const time = {
    hours: hours < 10 ? `0${hours}` : hours,
    minutes: minutes < 10 ? `0${minutes}` : minutes,
    seconds: seconds < 10 ? `0${seconds}`: seconds,
  }
  document.getElementById('fbTime').textContent = `${time.hours}:${time.minutes}:${time.seconds}`;
}

function submitDomain(e) {
  const value = document.querySelector('input').value;
  document.querySelector('input').value = '';  
}
