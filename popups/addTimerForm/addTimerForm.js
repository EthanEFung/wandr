document.querySelector('#addTimer').addEventListener('click', add$Timer, false);
document.querySelector('.cancelTimer').addEventListener('click', toggleTimersView, false)

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
    toggleTimersView(e);
    chrome.runtime.sendMessage(timer);
    const $inputs = document.querySelector('#addTimerForm')
      .querySelectorAll('input');
    for (let $input of $inputs) {
      $input.value = '';
    }
  }
}

function toggleTimersView(e) {
  e.preventDefault();
  e.stopPropagation();
  chrome.browserAction.setPopup({popup: '/popup.html'});
  window.location.href='/popup.html';
}