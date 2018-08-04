class Timer {
  constructor({
    name,
    hours,
    minutes,
    seconds,
    domains
  }) {
    this.name = name;
    this.hours = hours || 0
    this.minutes = minutes || 0
    this.seconds = seconds || 0
    this.isActive = false;
    this.interval;
    this.domains = domains;
  }
  save(){
    chrome.storage.local.set({
      [this.name] : {
        name: this.name,
        domains: this.domains,
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