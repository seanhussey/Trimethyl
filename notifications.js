/**
 * @class  Notifications
 * @author  Flavio De Stefano <flavio.destefano@caffeinalab.com>
 * Handle notifications system for both platform
 */


/**
 * * **inAppNotification**: Enable the in-app notifications. Default: `true`
 * * **inAppNotificationMethod**: The method of the in-app notification. Must be of of `alert`, `toast`. Default: `toast`
 * * **autoReset**: Check if auto-reset the badge when app is open.
 * * **driver**: The driver to use. Possible value are `cloud`.
 * @type {Object}
 */
var config = _.extend({
	inAppNotification: true,
	inAppNotificationMethod: 'toast',
	autoReset: true,
	driver: 'cloud',
}, Alloy.CFG.notifications);
exports.config = config;


function getDriver(driver) {
	return require('notifications.' + (driver||config.driver) );
}


function onNotificationReceived(e) {
	Ti.App.fireEvent('notifications.received', e);

	if (config.autoReset) {
		setBadge(0);
	}

	// Handle foreground notifications
	if (!e.inBackground && config.inAppNotification && e.data.alert) {
		if (config.inAppNotificationMethod=='toast') {
			require('toast').show(e.data.alert);
		} else if (config.inAppNotificationMethod=='alert') {
			require('util').simpleAlert(e.data.alert);
		}
	}
}


var subscribeFunction;
var unsubscribeFunction;

if (OS_IOS) {

	subscribeFunction = function(cb) {
		Ti.Network.registerForPushNotifications({
			callback: onNotificationReceived,
			types: [ Ti.Network.NOTIFICATION_TYPE_BADGE, Ti.Network.NOTIFICATION_TYPE_ALERT, Ti.Network.NOTIFICATION_TYPE_SOUND ],
			success: function(e){
				if (!e.deviceToken) {
					Ti.API.error("Notifications: Unable to get device token; "+e.error);
					Ti.App.fireEvent('notifications.subscription.error', e);
					return;
				}

				cb(e.deviceToken);

			},
			error: function(e){
				Ti.API.error("Notifications: "+e.error);
				Ti.App.fireEvent('notifications.subscription.error', e);
			},
		});
	};

	unsubscribeFunction = function(){
		Ti.Network.unregisterForPushNotifications();
	};

} else if (OS_ANDROID) {

	var CloudPush = require('ti.cloudpush');
	CloudPush.debug = !ENV_PRODUCTION;
	CloudPush.enabled = true;

	subscribeFunction = function(cb) {
		CloudPush.addEventListener('callback', onNotificationReceived);
		CloudPush.retrieveDeviceToken({
			success: function(e) {
				if (!e.deviceToken) {
					Ti.API.error("Notifications: Unable to get device token; "+e.error);
					Ti.App.fireEvent('notifications.subscription.error', e);
					return;
				}

				CloudPush.enabled = true;
				cb(e.deviceToken);

			},
			error: function(e) {
				Ti.API.error("Notifications: "+e.error);
				Ti.App.fireEvent('notifications.subscription.error', e);
			}
		});
	};

	unsubscribeFunction = function(){
		CloudPush.removeEventListener('callback', onNotificationReceived);
		CloudPush.enabled = false;
	};

}


/**
 * Subscribe for that channell
 * @param  {String} channel Channel name
 */
function subscribe(channel) {
	if (!subscribeFunction)	{
		Ti.API.error("Notifications: No subscribe function is defined");
		return;
	}

	if (ENV_DEVELOPMENT) {
		Ti.API.debug("Notifications: Subscribing to push notifications...");
	}

	subscribeFunction(function(token){
		if (ENV_DEVELOPMENT) {
			Ti.API.debug("Notifications: Subscribing success; device token is "+token);
		}

		var driver = getDriver();
		if (driver) driver.subscribe(token, channel, function(){
			if (ENV_DEVELOPMENT) {
				Ti.API.debug("Notifications: Subscribing success to driver");
			}
		});

	});

}
exports.subscribe = subscribe;


/**
 * Unsubscribe for that channel
 * @param  {String} channel Channel name
 */
function unsubscribe(channel) {
	if (!unsubscribeFunction)	{
		Ti.API.error("Notifications: No unsubscribe function is defined");
		return;
	}

	var driver = getDriver();
	if (driver) driver.unsubscribe(channel);
}
exports.unsubscribe = unsubscribe;


/**
 * Set the App badge value
 * @param {Number} x
 */
function setBadge(x) {
	if (OS_IOS) {
		Ti.UI.iPhone.setAppBadge(Math.max(x,0));
	} else if (OS_ANDROID) {
		// TODO
	}
}
exports.setBadge = setBadge;


/**
 * Get the App badge value
 * @return {Number}
 */
function getBadge() {
	if (OS_IOS) {
		return Ti.UI.iPhone.getAppBadge();
	} else if (OS_ANDROID) {
		// TODO
	}
}
exports.getBadge = getBadge;




/**
 * Increment the badge app
 * @param  {Number} i The value to increment
 */
function incBadge(i) {
	setBadge(getBadge()+i);
}
exports.incBadge = incBadge;


(function init(){

	if (config.autoReset) {
		setBadge(0);
		Ti.App.addEventListener('app.resumed', function(){
			setBadge(0);
		});
	}

})();
