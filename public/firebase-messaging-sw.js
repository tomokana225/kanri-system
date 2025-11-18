// This file MUST be in the root of the public directory
// It will be served at /firebase-messaging-sw.js

try {
  // Dynamically import the configuration from our Cloudflare function
  importScripts('/api/firebase-config-for-sw');
  
  // Import the Firebase SDKs. Use a version compatible with the compat libraries.
  importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js');

  // `firebaseConfig` is now available from the first import
  if (typeof firebaseConfig !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log(
        '[firebase-messaging-sw.js] Received background message ',
        payload
      );

      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        // You can add an icon here. It must be in your public folder.
        // icon: '/logo192.png', 
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (error) {
    console.error("Error in firebase-messaging-sw.js", error);
}
