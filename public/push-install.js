class LaraPush {
    currentDateTime = Math.floor(new Date().getTime() / 1e3);
    constructor(t, o) {
        this.options = t, this.data = o, this.writeInLog("options", {
            options: t
        }), this.writeInLog("data", {
            data: o
        }), this.init()
    }
    writeInLog(...t) {
        window.larapushLogger && console.log("LaraPush Log ::", ...t)
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
                scope: location.origin
            });
            return i.installing ? console.log("Service worker installing") : i.waiting ? console.log("Service worker installed") : i.active && console.log("Service worker active"), i
        } catch (e) {
            console.error("Registration failed with " + e)
        }
    };
    async initRegistration() {
        if ("granted" == await this.getPermission() && null != localStorage.getItem("notification_token")) this.writeInLog("Token is already with larapush");
        else {
            await Notification.requestPermission();
            var t = await this.registerServiceWorker();
            this.writeInLog("sw", t);
            let o = !1;
            for (; !o;) await this.waitForXSeconds(.1), o = t.active;
            let a = "";
            a = document.querySelector("#larapush-custom-segment") ? document.querySelector("#larapush-custom-segment").value : window.location.href, t.active.postMessage({
                command: "amp-web-push-subscribe",
                url: a
            })
        }
    }
    async getPermission() {
        var t = (await navigator.serviceWorker.getRegistrations()).filter(t => t.scope == location.origin);
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
    async notificationPermissionChangeHandler(t) {
        this.writeInLog("Notification Permission Changed", t), this.popup("hide"), "enable" == this.data.lockPageContent && "granted" != t || this.backdrop("hide"), this.updateBottomButtonContent(t), this.updateBackdropContent(t), "granted" == t && this.initRegistration(), "granted_default" == t && navigator.serviceWorker.getRegistrations().then(t => {
            for (var o of (this.writeInLog("Unsubscribed"), t)) o.unregister(), this.writeInLog("registration state", "unregistered"), this.writeInLog("registration unregistered", o)
        })
    }
    isMobile() {
        return window.innerWidth <= 480
    }
    isDesktop() {
        return !this.isMobile()
    }
    isCustomPopupIsEnabled() {
        return !!(this.isMobile() && "enable" == this.data.mobile || this.isDesktop() && "enable" == this.data.desktop)
    }
    isPageLockEnabled() {
        return "enable" == this.data.lockPageContent
    }
    async requestPermission() {
        this.popup("hide"), !this.isPageLockEnabled() && this.isCustomPopupIsEnabled() || this.backdrop("show"), this.isCustomPopupIsEnabled() || await this.waitForXSeconds(1), Notification.requestPermission().then(() => {
            "enable" != this.data.lockPageContent && this.backdrop("hide")
        })
    }
    async showPopupAndRequestPermission() {
        let t = async () => {
            "default" == await this.getPermission() ? this.isCustomPopupIsEnabled() ? this.isPageLockEnabled() ? this.backdrop("show") : (null == await this.readData("notification_rejected") || this.currentDateTime - parseInt(await this.readData("notification_rejected")) > parseInt(this.data.reappear)) && (await this.waitForXSeconds(this.data.delay), "enable" == this.data.backdrop && this.backdrop("show"), this.popup("show")) : (await this.waitForXSeconds(this.data.delay), this.requestPermission()) : "granted" == await this.getPermission() ? this.initRegistration() : "denied" == await this.getPermission() ? "enable" == this.data.lockPageContent ? this.backdrop("show") : this.writeInLog("Notifications are blocked") : "granted_default" == await this.getPermission() && this.writeInLog("Notifications permissions granted denied manually")
        };
        "complete" === document.readyState ? await t() : document.onreadystatechange = async () => {
            "complete" === document.readyState && await t()
        }
    }
    async loadBottomButtonAndPoweredBy() {
		
    }
    async updateBottomButtonContent(t) {
		
	}
    async updateBackdropContent(t) {
		
	}
    async bottomButtonSidebox(t = "") {
		
	}
    async bottomButtonTopbox(t = null, o = "") {
		
	}
    async bottomButton(t = null) {
		
	}
    getReferralUrl() {
		
	}
    async backdrop(t = null) {
		
	}
    async popup(t = null) {
		
	}
    openDatabase = () => new Promise((t, o) => {
        var a = indexedDB.open("autopushDataBase", 1);
        a.onupgradeneeded = t => {
            t.target.result.createObjectStore("myObjectStore", {
                keyPath: "id"
            })
        }, a.onsuccess = o => {
            t(o.target.result)
        }, a.onerror = t => {
            o(t.target.error)
        }
    });
    writeData = async (t, o) => {
        let a = (await this.openDatabase()).transaction("myObjectStore", "readwrite");
        return a.objectStore("myObjectStore").put({
            id: t,
            data: o
        }), new Promise((t, o) => {
            a.oncomplete = () => {
                t()
            }, a.onerror = () => {
                o(a.error)
            }
        })
    };
    readData = async t => {
        let o = (await this.openDatabase()).transaction("myObjectStore", "readonly").objectStore("myObjectStore").get(t);
        return new Promise((t, a) => {
            o.onsuccess = () => {
                t(o.result ? o.result.data : null)
            }, o.onerror = () => {
                a(o.error)
            }
        })
    };
    async init() {
        if (!window.LaraPushLoaded) {
            window.LaraPushLoaded = !0, await this.registerServiceWorker();
            let t = setInterval(async () => {
                if (null != document.body) {
                    clearInterval(t);
                    try {
                        this.loadBottomButtonAndPoweredBy(), this.setNotificationPermissionChangeListener(), (null == await this.readData("notification_rejected") || this.currentDateTime - parseInt(await this.readData("notification_rejected")) > parseInt(this.data.reappear)) && this.showPopupAndRequestPermission()
                    } catch (o) {
                        console.log(o)
                    }
                }
            }, 100)
        }
    }
}
let larapushInterval = setInterval(() => {
    "function" == typeof LoadLaraPush && (LoadLaraPush(), clearInterval(larapushInterval)), window.LaraPushLoaded && clearInterval(larapushInterval)
}, 500);

function LoadLaraPush() {
    if ("function" == typeof LaraPush) try {
        new LaraPush({
            referralCode: "GHJKUY"
        }, {
            logo: null,
            heading: null,
            subheading: null,
            themeColor: "#000000",
            allowText: null,
            denyText: null,
            desktop: "disable",
            mobile: "disable",
            mobileLocation: null,
            delay: "1",
            reappear: "0",
            bottomButton: "disable",
            buttonToUnsubscribe: null,
            lockPageContent: "disable",
            backdrop: "enable",
            popup_type: "default-prompt"
        })
    } catch (e) {
        console.error("Failed to initialize LaraPush:", e)
    } else console.error("LaraPush is not defined or not a function")
}
LoadLaraPush();
