document.querySelector('#addTimer').addEventListener('click', add$Timer, false);
document.querySelector('.cancelTimer').addEventListener('click', toggleTimersView, false);
document.querySelector('.addDomainButton').addEventListener('click', append$Domain, false);

function add$Timer(e) {
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
    chrome.runtime.sendMessage(timer);
    const $inputs = document.querySelector('#addTimerForm')
      .querySelectorAll('input');
    for (let $input of $inputs) {
      $input.value = '';
    }
    toggleTimersView(e);
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
  $input.setAttribute('class', 'addTimerDomain');

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
    $cancel.setAttribute('tabindex', '-1');
    $cancel.addEventListener('click', function(e) {
      e.preventDefault();
      $parent.querySelector('.timerDomains').removeChild($cancel.parentNode);
    });
    return $cancel;
  }
}