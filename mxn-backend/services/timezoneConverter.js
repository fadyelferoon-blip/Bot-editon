/**
 * Timezone Conversion Service
 * Converts bot signals (UTC+6) to user's local timezone
 */

class TimezoneConverter {
  /**
   * Convert signal time from UTC+6 to user's timezone
   * @param {string} signalTime - Time from bot in format "HH:MM:SS" (UTC+6)
   * @param {number} userTimezoneOffset - User's timezone offset (e.g., +2 for UTC+2)
   * @returns {Object} Converted time and difference
   */
  convertBotSignalToUserTime(signalTime, userTimezoneOffset) {
    const BOT_TIMEZONE = 6; // Bot works in UTC+6
    
    // Parse signal time
    const [hour, minute, second] = signalTime.split(':').map(Number);
    
    // Calculate timezone difference
    // User UTC+2, Bot UTC+6 → difference = 2 - 6 = -4
    const timezoneDiff = userTimezoneOffset - BOT_TIMEZONE;
    
    // Convert to user's timezone
    let userHour = hour + timezoneDiff;
    
    // Handle day rollover
    if (userHour < 0) {
      userHour += 24;
    } else if (userHour >= 24) {
      userHour -= 24;
    }
    
    return {
      hour: userHour,
      minute: minute,
      second: second,
      time: `${userHour}:${minute}:${second}`,
      originalTime: signalTime,
      timezoneDiff: timezoneDiff
    };
  }

  /**
   * Find next upcoming signal based on current time
   * @param {Array} signals - Array of signal objects with time
   * @param {number} userTimezoneOffset - User's timezone offset
   * @returns {Object} Next signal with countdown info
   */
  findNextSignal(signals, userTimezoneOffset) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const currentTotalSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;

    // Convert all signals to user timezone
    const convertedSignals = signals.map(signal => {
      const converted = this.convertBotSignalToUserTime(signal.time, userTimezoneOffset);
      
      const signalTotalSeconds = converted.hour * 3600 + converted.minute * 60 + converted.second;
      let secondsUntil = signalTotalSeconds - currentTotalSeconds;
      
      // If signal has passed today, it's for tomorrow
      if (secondsUntil < 0) {
        secondsUntil += 24 * 3600; // Add 24 hours
      }
      
      return {
        ...signal,
        localHour: converted.hour,
        localMinute: converted.minute,
        localSecond: converted.second,
        localTime: converted.time,
        secondsUntil: secondsUntil,
        minutesUntil: Math.floor(secondsUntil / 60),
        hoursUntil: Math.floor(secondsUntil / 3600)
      };
    });

    // Sort by time remaining (ascending)
    convertedSignals.sort((a, b) => a.secondsUntil - b.secondsUntil);

    return convertedSignals;
  }

  /**
   * Format countdown for display
   * @param {number} seconds - Total seconds until signal
   * @returns {string} Formatted time "HH:MM:SS"
   */
  formatCountdown(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

module.exports = new TimezoneConverter();
