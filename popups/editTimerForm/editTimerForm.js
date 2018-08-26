document.querySelector('#editTimer').addEventListener('click', edit$Timer, false);
document.querySelector('.cancelTimer').addEventListener('click', toggleTimersView, false);
document.querySelector('.addDomainButton').addEventListener('click', append$Domain, false);
document.querySelector('.addCurrentDomainButton').addEventListener('click', appendCurrentDomain, false);

document.addEventListener('DOMContentLoaded', function(e) {
  e.preventDefault();
  e.stopPropagation();

  chrome.storage.local.get(null, function(storage) {
    for (let i in storage) {
      if (storage[i].isEditing) {
        console.log('editing', storage[i]);
        document.querySelector('#editTimerName').value = storage[i].name;
        document.querySelector('#editTimerName').setAttribute('previousName', storage[i].name);
        clearEditTimerDomains();
        storage[i].domains.forEach(domain => {
          const $domain = append$Domain(e);
          $domain.querySelector('.editTimerDomain').value = domain;
        });
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
}, false);

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
    chrome.runtime.sendMessage(timer, () => {
      toggleTimersView(e);
    });
  }
}

function toggleTimersView(e) {
  e.preventDefault();
  e.stopPropagation();
  const name = document.querySelector('#editTimerName').value.split(/\s+/).join('-');
  chrome.storage.local.get(name, function(storage) {
    const t = storage[name];
    delete storage[name].isEditing;
    chrome.storage.local.set(storage);
    chrome.browserAction.setPopup({popup: '/popup.html'});
    window.location.href='/popup.html';
  });
}

function append$Domain(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const $parent = document.querySelector('.addDomainButton').parentNode;
  const $domain = document.createElement('li');
  const $input = document.createElement('input');
  $input.classList.add('addTimerDomain', 'editTimerDomain');

  $input.setAttribute('required', true);
  $input.setAttribute('placeholder', 'Timer Domain');
  $input.setAttribute('autocomplete', 'off');
  
  $domain.append($input, $cancelFactory());
  $domain.setAttribute('class', 'timerDomain');
  $parent.querySelector('.timerDomains').appendChild($domain);

  return $domain;

  function $cancelFactory() {
    const $cancel = document.createElement('button');
    $cancel.textContent = 'x';
    $cancel.setAttribute('type', 'button');
    $cancel.setAttribute('class', 'cancelDomain');
    $cancel.setAttribute('tabindex', '-1');
    $cancel.addEventListener('click', function(e) {
      e.preventDefault();
      $parent.querySelector('.timerDomains').removeChild($cancel.parentNode);
    });
    return $cancel;
  }
}

function appendCurrentDomain(e) {
  e.preventDefault();
  e.stopPropagation();

  chrome.windows.getCurrent({populate: true}, function(window) {
    window.tabs.forEach(tab => {
      if (tab.active) {
        const $domain = append$Domain(e);
        $domain.querySelector('input').value = domainify(tab.url);
      }
    });
  });
  const $button = document.querySelector('.addCurrentDomainButton');
  document.querySelector('#editTimerForm').removeChild($button);
}

function domainify(url) {
  const domain = url.split('://')[1]
  let result = '';
  for (let char of domain) {
    if (char === '/') break;
    result += char;
  }
  return result;
}