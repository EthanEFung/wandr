chrome.storage.onChanged.addListener(renderPopup);
chrome.browserAction.onClicked.addListener(renderPopup);

document.addEventListener('DOMContentLoaded', renderPopup, false);
document.querySelector('#initTimer').addEventListener('click', toggleAddTimerForm, false);
document.querySelector('#addDomainInput').addEventListener('click', addDomain, false);
document.querySelector('#submitTimer').addEventListener('click', addTimer, false);
document.querySelector('#cancelTimer').addEventListener('click', toggleAddTimerForm, false);

function renderPopup() {
  chrome.storage.local.get(null, 
    result => {
      clearDOMTimers();
      renderTimers(result);
    }
  );
}

function clearDOMTimers() {
  const $timers = document.querySelector('#timers');
  while ($timers.firstChild) {
    $timers.removeChild($timers.firstChild);
  } 
}

function renderTimers(timers) {
  for (let timer in timers) {
    renderTimer(timers[timer]);
  }
}

function renderTimer(timer) {
  const $timer = document.createElement('li');
  $timer.setAttribute('class', 'timer');

  const $time = document.createElement('span');
  $time.setAttribute('id', timer.name);

  const $label = document.createElement('label')
  $label.setAttribute('for', timer.name);
  $label.textContent = timer.name + ": ";

  $timer.append($label, $time);

  let hours = minutes = seconds = 0;
  if (timer) {
    hours = timer.hours;
    minutes = timer.minutes;
    seconds = timer.seconds;
  }
  const time = {
    hours: hours < 10 ? `0${hours}` : hours,
    minutes: minutes < 10 ? `0${minutes}` : minutes,
    seconds: seconds < 10 ? `0${seconds}`: seconds,
  };
  $time.textContent = 
    `${time.hours}:${time.minutes}:${time.seconds}`;

  document.querySelector('#timers').appendChild($timer);
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
  $input.setAttribute('class', 'addTimerDomain');
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
  const timer = {};
  timer.action = 'ADD_TIMER';
  timer.name = document.querySelector('#addTimerName').value.split(/\s+/).join('');
  timer.domains = [];

  const $domains = document.getElementsByClassName('addTimerDomain');
  let hasEmptyInputs = false;
  if (timer.name === '') {
    hasEmptyInputs = true;
  }
  for (let $domain of $domains) {
    if ($domain.value === '') {
      hasEmptyInputs = true;
      break;
    } else {
      timer.domains.push($domain.value);
    }
  }
  if (hasEmptyInputs) {
    return;
  } else {
    e.preventDefault();
    chrome.runtime.sendMessage(timer, renderPopup);
  }
}
