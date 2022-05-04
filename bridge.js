/* eslint-disable */
/**
 * 使用 JSBridge 总结：
 *  1、跟 IOS 交互的时候，只需要且必须注册 iosFuntion 方法即可，
 *      不能在 setupWebViewJavascriptBridge 中执行 bridge.init 方法，否则 IOS 无法调用到 H5 的注册函数；
 *  2、与安卓进行交互的时候
 *      ①、使用 iosFuntion，就可以实现 H5 调用 安卓的注册函数，但是安卓无法调用 H5 的注册函数，
 *          并且 H5 调用安卓成功后的回调函数也无法执行
 *      ②、使用 andoirFunction 并且要在 setupWebViewJavascriptBridge 中执行 bridge.init 方法，
 *          安卓才可以正常调用 H5 的回调函数，并且 H5 调用安卓成功后的回调函数也可以正常执行了
 */

const u = navigator.userAgent
// Android终端
const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1
// IOS 终端
const isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
// 微信端
const isWX = u.toLowerCase().match(/MicroMessenger/i) == "micromessenger";

/**
 * Android  与安卓交互时：
 *      1、不调用这个函数安卓无法调用 H5 注册的事件函数；
 *      2、但是 H5 可以正常调用安卓注册的事件函数；
 *      3、还必须在 setupWebViewJavascriptBridge 中执行 bridge.init 方法，否则：
 *          ①、安卓依然无法调用 H5 注册的事件函数
 *          ①、H5 正常调用安卓事件函数后的回调函数无法正常执行
 *
 * @param {*} callback
 */
const andoirFunction = (callback) => {
    if (window.WebViewJavascriptBridge) {
        callback(window.WebViewJavascriptBridge)
    } else {
        document.addEventListener('WebViewJavascriptBridgeReady', function () {
            callback(window.WebViewJavascriptBridge)
        }, false)
    }
}

/**
 * IOS 与 IOS 交互时，使用这个函数即可，别的操作都不需要执行
 * @param {*} callback
 */
const iosFuntion = (callback) => {
    if (window.WebViewJavascriptBridge) { return callback(WebViewJavascriptBridge); }
    if (window.WVJBCallbacks) { return window.WVJBCallbacks.push(callback); }
    window.WVJBCallbacks = [callback];

    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iOS_Native_InjectJavascript) {
        window.webkit.messageHandlers.iOS_Native_InjectJavascript.postMessage(null)
    } else {
        window.WVJBCallbacks = [callback]
        var WVJBIframe = document.createElement('iframe')
        WVJBIframe.style.display = 'none'
        WVJBIframe.src = 'wvjbscheme://__BRIDGE_LOADED__'
        document.documentElement.appendChild(WVJBIframe)
        setTimeout(function () {
            document.documentElement.removeChild(WVJBIframe)
        }, 0)
    }
}

/**
 * 注册 setupWebViewJavascriptBridge 方法
 *  之所以不将上面两个方法融合成一个方法，是因为放在一起，那么就只有 iosFuntion 中相关的方法体生效
 */
window.setupWebViewJavascriptBridge = isAndroid ? andoirFunction : iosFuntion

if (!isWX) { // 非微信浏览器端执行
    /**
     * 这里如果不做判断是不是安卓，而是直接就执行下面的方法，就会导致
     *      1、IOS 无法调用 H5 这边注册的事件函数
     *      2、H5 可以正常调用 IOS 这边的事件函数，并且 H5 的回调函数可以正常执行
     */
    if (isAndroid) {
        /**
         * 与安卓交互时，不调用这个函数会导致：
         *      1、H5 可以正常调用 安卓这边的事件函数，但是无法再调用到 H5 的回调函数
         *
         * 前提 setupWebViewJavascriptBridge 这个函数使用的是 andoirFunction 这个，否则还是会导致上面 1 的现象出现
         */
        window.setupWebViewJavascriptBridge(function (bridge) {
            // 注册 H5 界面的默认接收函数（与安卓交互时，不注册这个事件无法接收回调函数）
            bridge.init(function (msg, responseCallback) {
                responseCallback(msg)
            })
        })
    } else {
        window.setupWebViewJavascriptBridge()
    }
}

const TIME_OUT = 2000 // 超时时间,飞哥说的,有事找他,朱总知道的

/**
 * 启用webview动桥接设置
 * @param {String} name 注册的函数名
 * @param {Function} fn 回调函数
 */
function wbBridgeSetup(name, callback) {
    window.setupWebViewJavascriptBridge(bridge => {
        bridge.registerHandler(name, (data = '') => {
            try {
                data = JSON.parse(data)
            } catch (err) {

            }
            callback && callback(data)
        })
    })
}

function toJson(obj) {
    if (obj && typeof obj !== 'string') {
        obj = JSON.stringify(obj)
    }
    return obj
}
/**
 * APP功能暴露接口
 * @param {String} name 调用那个功能 setTitle | getCity | toast | enableRefresh | showProgress
 * | getUserInfo | tel | contacts | share | isLogin | wxpay | alipay
 * @param params 各个功能需要的参数
 * @param {*} cfn 设置成功后的回调函数
 *
 */
function appBridge(name, params, timeout = TIME_OUT) {
    let unresolved = true
    // ! 兼容处理
    const { version } = { version: '2.1.1' }
    const _v = +version.replace(/\./g, '')
    console.log(1111, _v)
    if (_v >= 211) {
        params = toJson(params)
    } else {
        if (!isIOS) {
            params = toJson(params)
        }
    }
    return new Promise((resolve, reject) => {
        const callback = data => {
            console.error('=====>', data)
            try {
                data = JSON.parse(data)
            } catch (err) {
            }
            unresolved = false
            console.info(`app指令${name}返回`, data)
            return resolve(data)
        }

        window.setupWebViewJavascriptBridge(bridge => {
            console.warn('调取app指令', name, params)
            bridge.callHandler(name, params, callback)
        })

        if (timeout) {
            setTimeout(() => {
                unresolved && resolve()
            }, timeout)
        }
    })
}
// 提供调试使用
window.app = (name, params) => {
    window.setupWebViewJavascriptBridge(bridge => {
        console.warn('调取app指令', name, params)
        bridge.callHandler(name, params, data => {
            try {
                data = JSON.parse(data)
            } catch (err) {
                // console.log('json parse 报错', err)
            }
            console.error('返回数据 ===>', data)
        })
    })
}


/* ---------------    调取原生指令 ---------------- */

/*
获取 authToken
1.6 版本后弃用,改用getUserInfo
*/
// function getAuthToken() {
//   return appBridge('getAuthToken')
// }


/* 弹出分享菜单 新 */
function popSocialMenu(data) {
    return appBridge('pop_social_menu', data)
}

// popSocialMenu(JSON.stringify(
//     {
//         // 菜单类型(0:分享到微信, 1:分享到朋友圈, 2:保存图片, 3:复制链接, 4:复制内容)
//         type: 1,
//         // 如果是分享，分享类型(0:默认，1:图片，2:音频，3:视频，4:小程序)
//         contentType: 2,
//         // 分享标题
//         title: 3,
//         // 分享内容，保存图片内容，复制的内容, 音频地址, 视频地址
//         content: 4,
//         // 分享小图片
//         thumb: 5,
//         // 分享的链接
//         link: 6,
//         // 分享的小程序path
//         miniAppPath: 7,
//         // 分享的小程序withShareTicket
//         miniAppTicket: 8,
//         // 分享的小程序版本 0:replease 1:test 2:preview
//         miniAppType: 9
//     }
// ))

(function (window) {
    //DES 解密
    const command = {
        popSocialMenu
    }
    window.command = command
}(this))