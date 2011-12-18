define(['EventMachine'], function (EventMachine) {

  var secondsInADay    = 1110;
  var secondsInAnHour  = secondsInADay / 24;
  var secondsInAMinute = secondsInAnHour / 60;

  var elapsedTime = 0;

  var targetTime = 0;

  var convertToTime = function (time) {
    var fullSeconds = 3600 * 24 * time / secondsInADay;
    var daySeconds  = fullSeconds % (3600 * 24);

    var days    = Math.floor(time / secondsInADay);
    var seconds = Math.floor(daySeconds % 60);
    var minutes = Math.floor((daySeconds % 3600) / 60);
    var hours   = Math.floor(daySeconds / 3600);

    return {
      days:    days,
      hours:   hours,
      minutes: minutes,
      seconds: seconds,
      time:    time
    };
  };

  var GameTime = {
    secondsInADay: secondsInADay,

    tick: function (delta) {
      elapsedTime += delta;
      if (elapsedTime > targetTime) {
	this.fireEvent('target time passed', targetTime);
      }
    },

    setTime: function (time) {
      elapsedTime = time;
    },

    setTargetTime: function (target) {
      targetTime = target;
    },

    elapsedTime: function () {
      return elapsedTime;
    },

    targetTime: function () {
      return targetTime;
    },

    gameTime: function () {
      // 7 AM is the start time
      return convertToTime(elapsedTime + 7 * secondsInAnHour);
    },

    gameTimeRemaining: function () {
      return convertToTime(targetTime - elapsedTime);
    }
  };

  EventMachine(GameTime);

  return GameTime;
});
