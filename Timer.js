class Timer {
  constructor(
    name, 
    state={
      hours: 0,
      minutes: 0,
      seconds: 0
    }
  ) {
    this.name = name;
    this.hours = state.hours;
    this.minutes = state.minutes;
    this.seconds = state.seconds;
    this.isActive = false;
    this.interval;
  }
  save(){
    chrome.storage.local.set({
      [this.name + 'Timer'] : {
        hours: this.hours,
        minutes: this.minutes,
        seconds: this.seconds
      }
    });
  }
  start() {
    this.isActive = true;
    this.interval = setInterval(() => {
      this.seconds++;
      if (this.seconds >= 60) {
        this.seconds = 0;
        this.minutes++;
      }
      if (this.minutes >= 60) {
        this.minutes = 0;
        this.hours++;
      }
      if (this.seconds % 2 === 0) this.save()
    }, 1000);
  }
  stop() {
    this.isActive = false;
    clearInterval(this.interval);
  }
}