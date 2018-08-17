chrome.storage.onChanged.addListener(renderPopup);
chrome.browserAction.onClicked.addListener(renderPopup);

document.addEventListener('DOMContentLoaded', renderPopup, false);
document.querySelector('#initTimer').addEventListener('click', toggleAddTimerForm, false);


for (let $button of document.getElementsByClassName('addDomainButton')) {
  $button.addEventListener('click', append$Domain);
}

function renderPopup(response) {
  chrome.storage.local.get(null, 
    result => {
      clear$Timers();
      render$Timers(result);
      removeBrowserTimerHandlers();
    }
  );

  function clear$Timers() {
    const $timers = document.querySelector('#timers');
    while ($timers.firstChild) {
      $timers.removeChild($timers.firstChild);
    } 
  }
  
  function render$Timers(timers) {
    for (let timer in timers) {
      render$Timer(timers[timer]);
    }
  }
  
  function removeBrowserTimerHandlers() {
    const $browserTimerOptions = document.querySelector('#browserTimer .timerOptions');
    while ($browserTimerOptions.firstChild) {
      $browserTimerOptions.removeChild($browserTimerOptions.firstChild);
    }
  }
}

function render$Timer(timer) {
  const $timer = document.createElement('li');
  $timer.setAttribute('class', 'timer');
  $timer.setAttribute('id', timer.name + 'Timer');

  const $label = document.createElement('label');
  $label.setAttribute('class', 'timerName');
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

    $menu.append($editFactory(), $deleteFactory());
    return $menu;
  }

  function $deleteFactory() {
    const $delete = document.createElement('button');
    $delete.classList.add('deleteTimer');
    $delete.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'DELETE_TIMER', timer }, function(res) {
        console.log(res);
      })
    });
    $delete.textContent = 'delete';

    return $delete;
  }

  function $editFactory() {
    const $edit = document.createElement('button');
    $edit.classList.add('editTimer');
    $edit.addEventListener

    $edit.addEventListener('click', toggleEditTimerForm);
    $edit.textContent = 'edit';
    return $edit;
  }
}

function toggleAddTimerForm(e) {
  e.stopPropagation();
  e.preventDefault();

  chrome.browserAction.setPopup({popup: 'popups/addTimerForm/addTimerForm.html'});
  window.location.href = 'popups/addTimerForm/addTimerForm.html';
}

function toggleEditTimerForm(e) {
  e.preventDefault();
  e.stopPropagation();
  const $timer = e.target.parentNode.parentNode;
  const name = $timer.querySelector('.timerTime').id;
  
  chrome.storage.local.get(name, function(storage) {
    storage[name].isEditing = true;
    chrome.storage.local.set(storage, function() {
      chrome.browserAction.setPopup({popup: '/popups/editTimerForm/editTimerForm.html'});
      window.location.href = '/popups/editTimerForm/editTimerForm.html';
    })
  });
}

function append$Domain(e) {
  const $parent = e.target.parentNode;

  e.stopPropagation();
  e.preventDefault();
  const $domain = document.createElement('li');
  const $input = document.createElement('input');
  $input.setAttribute('class', 'addTimerDomain');

  if ($parent.getAttribute('id') === "editTimerForm") $input.classList.add('editTimerDomain');

  $input.setAttribute('required', true);
  $input.setAttribute('placeholder', 'Timer Domain');
  $input.setAttribute('autocomplete', 'off');
  
  $domain.append($input, $cancelFactory());
  $domain.setAttribute('class', 'timerDomain');
  $parent.querySelector('.timerDomains').appendChild($domain);

  function $cancelFactory() {
    const $cancel = document.createElement('button');
    $cancel.textContent = 'x';
    $cancel.setAttribute('type', 'button');
    $cancel.setAttribute('class', 'cancelDomain');
    $cancel.addEventListener('click', function(e) {
      e.preventDefault();
      $parent.querySelector('.timerDomains').removeChild($cancel.parentNode);
    });
    return $cancel;
  }
}




