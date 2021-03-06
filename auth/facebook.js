/**
 * @class  	Auth.Facebook
 * @author  Flavio De Stefano <flavio.destefano@caffeinalab.com>
 */

var FB = require('T/facebook');
var _opt = null;

exports.login = function(opt) {
	_opt = opt;
	FB.authorize();
};

exports.logout = function() {
	FB.logout();
};

exports.isStoredLoginAvailable = function() {
	return FB.loggedIn || !_.isEmpty(FB.accessToken);
};

exports.storedLogin = function(opt) {
	if (exports.isStoredLoginAvailable()) {
		opt.success({ access_token: FB.accessToken });
	} else {
		opt.error();
	}
};

/*
Init
*/

FB.forceDialogAuth = false;
FB.addEventListener('login', function(e){
	// This is a security hack caused by iOS SDK that automatically trigger the login event
	if (_opt == null) {
		return Ti.API.debug('Auth.Facebook: login prevented');
	}

	if (e.success === true) {
		_opt.success({ access_token: FB.accessToken });
	} else {
		_opt.error({
			message: (e.error && e.error.indexOf('OTHER:') !== 0) ? e.error : L('unexpected_error', 'Unexpected error')
		});
	}

	_opt = null;
});
