var swVersion = "3.0.9";
const firebaseVersion = '8.9.1';
const http = 1;

importScripts("https://www.gstatic.com/firebasejs/" + firebaseVersion + "/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/" + firebaseVersion + "/firebase-messaging.js");

const options = {
    firebaseConfig: {
        projectId: "push-9a665",
        messagingSenderId: "1023228214099",
        appId: "1:1023228214099:web:750723559f00a405147fa6",
        apiKey: "AIzaSyBPei7_T6p1YDyoXNID7cFRixX96pPJ2Z0",
    },
    domain: "autopush.in",
    api_url: "https://api.autopush.in/token/save.php",
    vapid_public_key: "BCQhmt3Juj00X6yakLlIAAzuj_YgbHOHTRQdZwfPS_PX4q05cUttnrrAHZcLuI2fbN5DlV-1nQh8FkPlC0_xbAg",
}

firebase.initializeApp({ ...options.firebaseConfig });

self.addEventListener('activate', function (a) {
    a.waitUntil(clients.claim())
    onMessageReceivedSubscribe(self.location.href);
});

self.addEventListener("install", function (i) {
    self.skipWaiting()
})

/**
  * Receives push notification.
  * 
  * Shows the notification to the user.
 */
self.addEventListener('push', (event) => {
    const payload = JSON.parse(event.data.json().data.notification)

    let isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (payload.requireInteraction == null) {
        payload.requireInteraction = false;
    }
    let requireInteraction = isMac ? false : payload.requireInteraction;

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            ...payload,
            data: payload,
            requireInteraction: requireInteraction
        })
    );

    if (event.data.json().data.swVersion != swVersion) {
        console.log("SW Version is different, Updating SW");
        self.registration.update()
    }
});

/**
  * Gets called when notification is clicked.
  * 
  * Opens a new tab in browser.
 */
self.addEventListener('notificationclick', (event) => {
    let targetUrl = event.notification.data.url;
    let apiUrl = event.notification.data.api_url;

    if (event.action && event.notification.data.actions[event.action]) {
        targetUrl = event.notification.data.actions[event.action].click_action;
        apiUrl = event.notification.data.actions[event.action].api_url;
    }

    clients.openWindow(targetUrl);
    fetch(apiUrl);
    event.notification.close();
});


/** ================= FOR AMP ================ */

/** @enum {string} */
const WorkerMessengerCommand = {
    /*
      Used to request the current subscription state.
     */
    AMP_SUBSCRIPTION_STATE: 'amp-web-push-subscription-state',
    /*
      Used to request the service worker to subscribe the user to push.
      Notification permissions are already granted at this point.
     */
    AMP_SUBSCRIBE: 'amp-web-push-subscribe',
    /*
      Used to unsusbcribe the user from push.
     */
    AMP_UNSUBSCRIBE: 'amp-web-push-unsubscribe',
};

self.addEventListener('message', (event) => {
    /*
      Messages sent from amp-web-push have the format:
  
      - command: A string describing the message topic (e.g.
        'amp-web-push-subscribe')
  
      - payload: An optional JavaScript object containing extra data relevant to
        the command.
     */
    const { command, url } = event.data;

    switch (command) {
        case WorkerMessengerCommand.AMP_SUBSCRIPTION_STATE:
            onMessageReceivedSubscriptionState();
            break;
        case WorkerMessengerCommand.AMP_SUBSCRIBE:
            onMessageReceivedSubscribe(url);
            break;
        case WorkerMessengerCommand.AMP_UNSUBSCRIBE:
            onMessageReceivedUnsubscribe();
            break;
    }
});

/**
 * Broadcasts a single boolean describing whether the user is subscribed.
 */
function onMessageReceivedSubscriptionState() {
    let retrievedPushSubscription = null;
    self.registration.pushManager
        .getSubscription()
        .then((pushSubscription) => {
            retrievedPushSubscription = pushSubscription;
            if (!pushSubscription) {
                return null;
            } else {
                return self.registration.pushManager.permissionState(pushSubscription.options);
            }
        })
        .then((permissionStateOrNull) => {
            if (permissionStateOrNull == null) {
                broadcastReply(WorkerMessengerCommand.AMP_SUBSCRIPTION_STATE, false);
            } else {
                const isSubscribed = !!retrievedPushSubscription && permissionStateOrNull === "granted";
                broadcastReply(WorkerMessengerCommand.AMP_SUBSCRIPTION_STATE, isSubscribed);
            }
        });
}

/**
 * Subscribes the visitor to push.
 *
 * The broadcast value is null (not used in the AMP page).
 */
async function onMessageReceivedSubscribe(url) {
    try {
        await subscribePushManager(url);
    } catch (error) {
        console.log("Error in onMessageReceivedSubscribe: ", error);
        // Unsubscribe the old service worker subscription
        const subscription = await self.registration.pushManager.getSubscription();
        if (subscription) {
            const successful = await subscription.unsubscribe();
            if (successful) {
                console.log("Unsubscribed successfully");
                // Retry the subscription
                await subscribePushManager(url);
            } else {
                console.log("Unsubscribe failed");
            }
        }
    }
}

let promiseChain = Promise.resolve();
async function subscribePushManager(url) {
    promiseChain = promiseChain.then(async () => {
        await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: options.vapid_public_key,
        });

        broadcastReply(WorkerMessengerCommand.AMP_SUBSCRIBE, null);
        var newSubscription = await self.registration.pushManager.getSubscription();
        newSubscription = newSubscription.toJSON();

        if (firebase.messaging().vapidKey == null) {
            firebase.messaging().usePublicVapidKey(options.vapid_public_key);
        }

        const messaging = firebase.messaging();
        const token = await messaging.getToken({
            serviceWorkerRegistration: self.registration,
        });

        if ((await this.readData("notification_token")) != token) {
            domain = options.domain;
			topic = "alluser";
            if(http){
                domain = getDomainAndHostname(url).hostname;
				topic = domain.replace(/\./g, '');
            }
            await fetch(options.api_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    domain,
                    token,
                    url: url,
                    endpoint: newSubscription.endpoint,
                    auth: newSubscription.keys.auth,
                    p256dh: newSubscription.keys.p256dh,
                    vapidpublickey: options.vapid_public_key,
                    expirationTime: newSubscription.expirationTime,
                    topic: topic,
                }),
            }).then(async (res) => {
                if (res.status == 200) {
                    await this.writeData("notification_token", token);
                    console.log("Notification Token Sent.");
                    return res.json();
                }
                console.log("Notification Token Send Error ", res.status);
            });
        }
    }).catch(err => {
        console.log('Error:', err);
    });
}

/**
 * Get Hostname from URL
 */
function getDomainAndHostname(url) {
    const urlObj = new URL(url);
    return {
        hostname: urlObj.hostname
    };
}

/**
 * Unsubscribes the subscriber from push.
 *
 * The broadcast value is null (not used in the AMP page).
 */
function onMessageReceivedUnsubscribe() {
    self.registration.pushManager
        .getSubscription()
        .then((subscription) => subscription.unsubscribe())
        .then(() => {
            // OPTIONALLY IMPLEMENT: Forward the unsubscription to your server here
            broadcastReply(WorkerMessengerCommand.AMP_UNSUBSCRIBE, null);
        });
}

/**
 * Sends a postMessage() to all window frames the service worker controls.
 * @param  {string} command
 * @param  {!JsonObject} payload
 */
function broadcastReply(command, payload) {
    self.clients.matchAll().then((clients) => {
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            client./*OK*/ postMessage({
                command,
                payload,
            });
        }
    });
}

/**
 * IndexedDB Helper
 */
openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("autopushDataBase", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore("myObjectStore", { keyPath: "id" });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

/**
 * IndexedDB Write Helper
 */
writeData = async (key, value) => {
    const db = await this.openDatabase();
    const transaction = db.transaction("myObjectStore", "readwrite");
    const objectStore = transaction.objectStore("myObjectStore");
    const request = objectStore.put({ id: key, data: value });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve();
        };
        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
};

/**
 * IndexedDB Read Helper
 */
readData = async (key) => {
    const db = await this.openDatabase();
    const transaction = db.transaction("myObjectStore", "readonly");
    const objectStore = transaction.objectStore("myObjectStore");
    const request = objectStore.get(key);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result ? request.result.data : null);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};