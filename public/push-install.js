class AutoPush {
    constructor(o) {
        this.data = o, this.init()
    }
    writeInLog(...t) {
        window.autopushLogger && console.log("AutoPush Log ::", ...t)
    }
    async waitForXSeconds(t) {
        return new Promise(o => {
            setTimeout(() => {
                o()
            }, 1e3 * t)
        }).catch(() => {
            this.writeInLog("Error in waitForXSeconds")
        })
    }
    registerServiceWorker = async () => {
        if ("serviceWorker" in navigator) try {
            try {
                var t;
                for (t of (await navigator.serviceWorker.getRegistrations())) {
                    var o = t.active.scriptURL;
                    (o.includes("OneSignalSDKWorker.js") || o.includes("sw2.php") || o.includes("firebase-messaging-sw.js") || o.includes("sw.enot.js") || o.includes("service-worker-loader.js.php")) && (await t.unregister() ? console.log("Service Worker: Unregistered " + o + " successfully.") : console.log("Service Worker: Unregistration of " + o + " failed."))
                }
            } catch (a) {
                console.error("Error:", a)
            }
            var i = await navigator.serviceWorker.register(location.origin + "/push-sw.js", {
                scope: location.origin + "/"
            });
            return i.installing ? console.log("Service worker installing") : i.waiting ? console.log("Service worker installed") : i.active && console.log("Service worker active"), i
        } catch (e) {
            console.error("Registration failed with " + e)
        }
    };
    async initRegistration() {
        await Notification.requestPermission();
        const registration = await this.registerServiceWorker();
        this.writeInLog("sw", registration);

        let isActive = false;
        while (!isActive) {
            await this.waitForXSeconds(0.1);
            isActive = registration.active;
        }

        registration.active.postMessage({
            command: "amp-web-push-subscribe",
            url: window.location.href
        });
    }

    async getPermission() {
        var t = (await navigator.serviceWorker.getRegistrations()).filter(t => t.scope == location.origin + "/");
        let o = await Notification.permission;
        return "granted" == o ? 0 < t.length ? "granted" : "granted_default" : "default" == o ? "default" : "denied"
    }
    async setNotificationPermissionChangeListener() {
        "permissions" in navigator && navigator.permissions.query({
            name: "notifications"
        }).then(t => {
            t.onchange = () => {
                let o = t.state;
                "prompt" == t.state && (o = "default"), this.notificationPermissionChangeHandler(o)
            }
        })
    }
    async notificationPermissionChangeHandler(permission) {
        this.writeInLog("Notification Permission Changed", permission);
        if (permission === "granted") {
            this.initRegistration();
        }

        if (permission === "granted_default") {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                this.writeInLog("Unsubscribed");
                for (const reg of registrations) {
                    reg.unregister();
                    this.writeInLog("registration state", "unregistered");
                    this.writeInLog("registration unregistered", reg);
                }

            });

        }
    }

    async requestPermission() {
        await this.waitForXSeconds(1);
        Notification.requestPermission().then(() => {

        });
    }
    async showPopupAndRequestPermission() {
        let runLogic = async () => {
            const permission = await this.getPermission();
            if (permission === "default") {
                await this.waitForXSeconds(this.data.delay);
                this.requestPermission();
            } else if (permission === "granted") {
                this.initRegistration();
            } else if (permission === "granted_default") {
                this.writeInLog("Notifications permissions granted denied manually");
            }
        };

        if (document.readyState === "complete") {
            await runLogic();
        } else {
            document.onreadystatechange = async () => {
                if (document.readyState === "complete") {
                    await runLogic();
                }
            };
        }
    }
    async isIOS() {
        return !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i);
    }
    async init() {
        if (!window.AutoPushLoaded) {
            window.AutoPushLoaded = true;
            if (this.isIOS()) {
                return;
            }
            await this.registerServiceWorker();
            let interval = setInterval(async () => {
                if (document.body != null) {
                    clearInterval(interval);
                    try {
                        this.setNotificationPermissionChangeListener();
                        this.showPopupAndRequestPermission();
                    } catch (error) {
                        console.log(error);
                    }
                }
            }, 100);
        }
    }
}

function LoadAutoPush() {
    if ("function" == typeof AutoPush) try {
        new AutoPush({
            delay: "1"
        })
    } catch (e) {
        console.error("Failed to initialize AutoPush:", e)
    } else console.error("AutoPush is not defined or not a function")
}
LoadAutoPush();
