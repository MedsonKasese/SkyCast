<<<<<<< HEAD
   
=======
// Utility functions for SkyCast

export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function formatTemperature(celsius, isFahrenheit = false) {
  if (isFahrenheit) {
    return Math.round((celsius * 9/5) + 32);
  }
  return Math.round(celsius);
}

export function getWeatherIcon(condition) {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
    return 'assets/images/icon-sunny.webp';
  } else if (conditionLower.includes('cloud')) {
    return 'assets/images/icon-overcast.webp';
  } else if (conditionLower.includes('rain')) {
    return 'assets/images/icon-rain.webp';
  } else if (conditionLower.includes('snow')) {
    return 'assets/images/icon-snow.webp';
  } else if (conditionLower.includes('drizzle')) {
    return 'assets/images/icon-drizzle.webp';
  } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
    return 'assets/images/icon-fog.webp';
  } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
    return 'assets/images/icon-storm.webp';
  } else if (conditionLower.includes('partly')) {
    return 'assets/images/icon-partly-cloudy.webp';
  }
  
  return 'assets/images/icon-sunny.webp';
}

export function isOnline() {
  return navigator.onLine;
}

export function addOnlineListener(callback) {
  window.addEventListener('online', callback);
}

export function addOfflineListener(callback) {
  window.addEventListener('offline', callback);
}
>>>>>>> 694bc4296a9ac1fbc352b34f9c657f9c92a875bf
