chrome.storage.onChanged.addListener(renderPopup);
chrome.browserAction.onClicked.addListener(renderPopup);

document.addEventListener('DOMContentLoaded', renderPopup, false);
document.querySelector('#initTimer').addEventListener('click', toggleAddTimerForm, false);
document.querySelector('#addDomainButton').addEventListener('click', addDomain, false);
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
  $timer.setAttribute('id', timer.name + 'Timer');

  const $label = document.createElement('label');
  $label.setAttribute('class', 'timerName')
  $label.setAttribute('for', timer.name);
  $label.textContent = timer.name.split('-').join(' ') + ": ";

  const $time = document.createElement('span');
  $time.setAttribute('class', 'timerTime');
  $time.setAttribute('id', timer.name);

  const $menu = $menuFactory();
  
  $timer.append($label, $time, $menu);

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

  function $menuFactory() {
    const $menu = document.createElement('div');
    $menu.setAttribute('class', 'timerOptions');
    $menu.textContent = '...'
    
    $menu.append($deleteFactory(), $editFactory())
    return $menu;
  }

  function $deleteFactory() {
    const $delete = document.createElement('a');
    $delete.setAttribute('class', 'deleteTimer');
    $delete.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'DELETE_TIMER', timer }, function(res) {
        console.log('Timer Deleted', res);
      })
    });
    $delete.textContent = 'delete';

    return $delete;
  }

  function $editFactory() {
    const $edit = document.createElement('a');
    $edit.setAttribute('class', 'editTimer');
    $edit.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      populateEditForm(timer);
    });
    $edit.textContent = 'edit';
    return $edit;
  }
}

function toggleAddTimerForm(e) {
  e.stopPropagation();
  e.preventDefault();
  
  const $form = document.querySelector('#addTimerForm');
  const $initBtn = document.querySelector('#initTimer');
  const $main = document.querySelector('.main');
  if ($form.classList.contains('hidden')) {
    $form.classList.remove('hidden');
    $initBtn.classList.add('hidden');
    $main.classList.add('hidden');
  } else {
    $form.classList.add('hidden');
    $initBtn.classList.remove('hidden');
    $main.classList.remove('hidden');
  }
}

function populateEditForm(res) {
  const $editForm = document.querySelector('#editTimerForm');
  $editForm.removeAttribute('hidden');
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
    $cancel.setAttribute('class', 'cancelDomain');
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
  timer.name = document.querySelector('#addTimerName').value.split(/\s+/).join('-');
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
    toggleAddTimerForm(e);
    chrome.runtime.sendMessage(timer, renderPopup);
    const $inputs = document.querySelector('#addTimerForm')
      .querySelectorAll('input');
    for (let $input of $inputs) {
      $input.value = '';
    }
  }
}
