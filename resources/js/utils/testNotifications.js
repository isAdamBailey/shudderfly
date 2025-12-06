// Test notification utilities - run these in browser console to debug notifications

window.testNotificationSystem = async function() {
  console.log('=== Testing Notification System ===\n');
  
  // 1. Check Notification API support
  console.log('1. Notification API Support:');
  if ('Notification' in window) {
    console.log('   ✅ Notification API is supported');
    console.log('   Permission:', Notification.permission);
  } else {
    console.log('   ❌ Notification API is NOT supported');
    return;
  }
  
  // 2. Check Service Worker support
  console.log('\n2. Service Worker Support:');
  if ('serviceWorker' in navigator) {
    console.log('   ✅ Service Worker is supported');
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('   ✅ Service Worker is registered');
        console.log('   Scope:', registration.scope);
      } else {
        console.log('   ⚠️  Service Worker is NOT registered');
      }
    } catch (error) {
      console.log('   ❌ Error checking service worker:', error);
    }
  } else {
    console.log('   ❌ Service Worker is NOT supported');
  }
  
  // 3. Check Echo/Pusher
  console.log('\n3. Echo/Pusher Connection:');
  if (window.Echo) {
    console.log('   ✅ Echo is available');
    // Try to get user from page props
    if (window.usePage) {
      const page = window.usePage();
      const user = page?.props?.auth?.user;
      if (user) {
        console.log('   ✅ User authenticated:', user.id);
        const channelName = `App.Models.User.${user.id}`;
        console.log('   Expected channel:', channelName);
      } else {
        console.log('   ⚠️  User not authenticated');
      }
    }
  } else {
    console.log('   ❌ Echo is NOT available');
  }
  
  // 4. Test browser notification
  console.log('\n4. Testing Browser Notification:');
  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification('Test Notification', {
            body: 'If you see this, browser notifications are working!',
            icon: '/android-chrome-192x192.png',
            tag: 'test-notification'
          });
          console.log('   ✅ Test notification sent via Service Worker');
        } else {
          new Notification('Test Notification', {
            body: 'If you see this, browser notifications are working!',
            icon: '/android-chrome-192x192.png'
          });
          console.log('   ✅ Test notification sent (no service worker)');
        }
      } else {
        new Notification('Test Notification', {
          body: 'If you see this, browser notifications are working!',
          icon: '/android-chrome-192x192.png'
        });
        console.log('   ✅ Test notification sent');
      }
    } catch (error) {
      console.log('   ❌ Error showing test notification:', error);
    }
  } else if (Notification.permission === 'default') {
    console.log('   ⚠️  Permission not yet requested. Requesting...');
    const permission = await Notification.requestPermission();
    console.log('   Permission result:', permission);
    if (permission === 'granted') {
      console.log('   ✅ Permission granted! Try the test again.');
    }
  } else {
    console.log('   ❌ Permission denied. Please enable notifications in browser settings.');
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\nTo test a real notification, tag yourself in a message.');
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.testNotificationSystem = window.testNotificationSystem;
}

