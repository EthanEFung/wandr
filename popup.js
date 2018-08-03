const timerSelectors = ['browserTimer', 'fbTimer'];

chrome.storage.onChanged.addListener(renderPopup);
chrome.browserAction.onClicked.addListener(renderPopup);

document.addEventListener('DOMContentLoaded', renderPopup, false);
document.querySelector('#initTimer').addEventListener('click', toggleAddTimerForm, false);
document.querySelector('#addDomainInput').addEventListener('click', addDomain, false);
document.querySelector('#submitTimer').addEventListener('click', addTimer, false);
document.querySelector('#cancelTimer').addEventListener('click', toggleAddTimerForm, false);

function renderPopup() {
  chrome.storage.local.get(null, 
    result => timerSelectors.forEach($timer => renderTimer($timer, result))
  );
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

function toggleAddTimerForm(e) {
  e.stopPropagation();
  e.preventDefault();
  
  const $form = document.querySelector('#addTimerForm');
  const $initBtn = document.querySelector('#initTimer');
  if ($form.hasAttribute('hidden')) {
    $form.removeAttribute('hidden');
    $initBtn.setAttribute('hidden', true);
  } else {
    $form.setAttribute('hidden', true);
    $initBtn.removeAttribute('hidden');
  }
}

function addDomain(e) {
  e.stopPropagation();
  e.preventDefault();
  const $domain = document.createElement('li');
  const $input = document.createElement('input');
  $input.setAttribute('required', true);
  $input.setAttribute('placeholder', 'Timer Domain');
  $input.setAttribute('autocomplete', 'off');
  
  $domain.append($input, $cancelFactory());
  $domain.setAttribute('class', 'timerDomain');
  document.querySelector('#timerDomains').appendChild($domain);

  function $cancelFactory() {
    const $cancel = document.createElement('button');
    $cancel.textContent = 'x';
    $cancel.setAttribute('type', 'button');
    $cancel.addEventListener('click', function(e) {
      e.preventDefault();
      document.body.querySelector('#timerDomains').removeChild($cancel.parentNode);
    });
    return $cancel;
  }
}

function addTimer(e) {
  e.stopPropagation();
}
