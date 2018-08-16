document.querySelector('#editTimer').addEventListener('click', edit$Timer, false);
document.querySelector('.cancelTimer').addEventListener('click', toggleTimersView, false);
document.querySelector('.addDomainButton').addEventListener('click', append$Domain, false);

document.addEventListener('DOMContentLoaded', function(e) {
  e.preventDefault();
  e.stopPropagation();

  chrome.storage.local.get(null, function(storage) {
    for (let i in storage) {
      if (storage[i].isEditing) {
        document.querySelector('#editTimerName').value = storage[i].name;
        document.querySelector('#editTimerName').setAttribute('previousName', storage[i].name);
        clearEditTimerDomains();
        storage[i].domains.forEach(domain => {
          const $domain = document.createElement('input');
          $domain.setAttribute('autocomplete', 'off');
          $domain.classList.add('editTimerDomain');
          $domain.value = domain;
          const $li = document.createElement('li');
          $li.append($domain);
          document.querySelector('#editTimerDomains').append($li);
        });

        delete storage[i].isEditing;
        chrome.storage.local.set(storage);
      }
    }
  });

  function clearEditTimerDomains() {
    const $domains = document.querySelector('#editTimerDomains');
    while ($domains.firstChild) {
      $domains.removeChild($domains.firstChild);
    }
  } 
});


function edit$Timer(e) {
  e.stopPropagation();
  const timer = {};
  timer.action = 'EDIT_TIMER';
  timer.name = document.querySelector('#editTimerName').value.split(/\s+/).join('-');
  timer.previousName = document.querySelector('#editTimerName').getAttribute('previousName');
  timer.domains = [];

  const $domains = document.getElementsByClassName('editTimerDomain');

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
    const $inputs = document.querySelector('#editTimerForm')
      .querySelectorAll('input');
    for (let $input of $inputs) {
      $input.value = '';
    }
    chrome.runtime.sendMessage(timer, response => {
      console.log('received', response);
      toggleTimersView(e)
    });
  }
}

function toggleTimersView(e) {
  e.preventDefault();
  e.stopPropagation();
  chrome.browserAction.setPopup({popup: '/popup.html'});
  window.location.href='/popup.html';
}

function append$Domain(e) {
  const $parent = e.target.parentNode;

  e.stopPropagation();
  e.preventDefault();
  const $domain = document.createElement('li');
  const $input = document.createElement('input');
  $input.classList.add('addTimerDomain', 'editTimerDomain');

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