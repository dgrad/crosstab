/**
 * Simple library to keep a list of open tabs.
 *
 * Usage:
 *
 *  crosstab.init(data); // data = additional data
 *
 *  var tabs = crosstab.all()
 */
 /* global console: true */
 /* global define: true */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define('crosstab', factory);
    } else {
        // Browser globals, Window
        root.crosstab = factory();
    }
}(this, function () {
   'use strict';

    // --- Handle Support ---
    // See: http://detectmobilebrowsers.com/about
    var useragent = navigator.userAgent || navigator.vendor || window.opera;
    var isMobile = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(useragent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(useragent.substr(0, 4)));

    var KEEP_ALIVE_INTERVAL = 4000;
    var INACTIVITY_TIMEOUT = 10000;
    var keepAliveTimer;
    var PREFIX = 'crosstab.';
    var TAB_LIST_STORAGE_NAME = 'crosstab.TABS';

    var localStorage;

    try {
        localStorage = window.localStorage;
    } catch (e) {
    }

    var util = {};

    util.pad = function(num, width, padChar) {
        padChar = padChar || '0';
        var numStr = (num.toString());

        if (numStr.length >= width) {
            return numStr;
        }

        return new Array(width - numStr.length + 1).join(padChar) + numStr;
    };

    util.now = function () {
        return (new Date()).getTime();
    };

    util.generateId = function () {
        /*jshint bitwise: false*/
        return util.now().toString() + util.pad((Math.random() * 0x7FFFFFFF) | 0, 10);
    };

    var getLocalStorageItem = function(key, defaultValue) {
        var data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    };

    var setLocalStorageItem = function(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    };

    var keepAlive = function() {
        var tab = {
            id: crosstab.id,
            data: crosstab.data,
            timestamp: util.now()
        };
        setLocalStorageItem(PREFIX + crosstab.id, tab);
        refreshTabList();
    };

    var setData = function(data) {
        crosstab.data = data;
        var tab = {
            id: crosstab.id,
            data: data,
            timestamp: util.now()
        };
        setLocalStorageItem(PREFIX + crosstab.id, tab);
    };

    var addTab = function(data) {
        var tabs = getLocalStorageItem(TAB_LIST_STORAGE_NAME, []);
        for (var i = 0; i < tabs.length; ++i) {
            if (tabs[i] === crosstab.id) {
                return;
            }
        }
        tabs.push(String(crosstab.id));
        setLocalStorageItem(TAB_LIST_STORAGE_NAME, tabs);
        setData(data);
    };

    var all = function() {
        var tabs = getLocalStorageItem(TAB_LIST_STORAGE_NAME, []);
        var output = {};
        for (var i = 0; i < tabs.length; ++i) {
            var tabId = tabs[i];
            var tab = getLocalStorageItem(PREFIX + tabId);
            if (tab) {
                output[tabId] = tab;
            }
        }
        return output;
    };

    var cleanTabs = function(tabs2Remove, tabs2Keep) {
        if (tabs2Remove.length) {
            setLocalStorageItem(TAB_LIST_STORAGE_NAME, tabs2Keep);
            for (var i = 0; i < tabs2Remove.length; ++i) {
                localStorage.removeItem(PREFIX + tabs2Remove[i]);
            }
        }
    };

    var removeTab = function(tabId) {
        var tabs2Keep = getLocalStorageItem(TAB_LIST_STORAGE_NAME, []);
        var tabs2Remove = [tabId];
        var index = tabs2Keep.indexOf(tabId);
        if (index > -1) {
            tabs2Keep.splice(index, 1);
        }
        cleanTabs(tabs2Remove, tabs2Keep);
    };

    var beforeUnload = function() {
        try {
            clearInterval(keepAliveTimer);
            removeTab(crosstab.id);
        } catch (e) {
            console.error(e);
        }
    };

    var refreshTabList = function() {
        var tabs = getLocalStorageItem(TAB_LIST_STORAGE_NAME, []);
        var now = util.now();
        var tabs2Remove = [];
        var tabs2Keep = [];
        var tabWasRemoved = true;

        for (var i = 0; i < tabs.length; ++i) {
            var tabId = tabs[i];

            // Never remove this tab
            if (tabId == crosstab.id) {
                tabs2Keep.push(tabId);
                tabWasRemoved = false;
                continue;
            }

            var tab = getLocalStorageItem(PREFIX + tabId);

            // Remove if inactive
            if (!tab || tab.timestamp < (now - INACTIVITY_TIMEOUT) ) {
                tabs2Remove.push(tabId);
            } else {
                tabs2Keep.push(tabId);
            }
        }

        // Add the tab again if it was removed
        if (tabWasRemoved) {
            addTab(crosstab.data);
        }

        cleanTabs(tabs2Remove, tabs2Keep);
    };

    var crosstab = {};

    crosstab.supported = !!localStorage && window.addEventListener && !isMobile;

    crosstab.init = function(data) {
        try {

            crosstab.id = util.generateId();
            crosstab.data = data;
            crosstab.setData = setData;
            crosstab.all = all;

            if (crosstab.supported) {
                addTab(data);
                window.addEventListener('beforeunload', beforeUnload, false);
                keepAliveTimer = setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
            }

        } catch (e) {
            crosstab.supported = false;
            console.error(e);
        }
    };

    return crosstab;

}));

