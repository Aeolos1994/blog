/**
 *  service单例实现事件总线
 */
(function () {
    "use strict";
    angular.module('app').factory('iBus', iBus);
    iBus.$inject = ['$q'];

    function iBus($q) {
        var eventPools = {
            publicPool: {}
        };

        var tools = {
            emit: function (poolName, eventName, data) {
                eventPools[poolName] = eventPools[poolName] || {};
                eventPools[poolName][eventName] = eventPools[poolName][eventName] || [];
                eventPools[poolName][eventName].forEach(function (existCallback) {
                    existCallback(data);
                })
            },
            on: function (poolName, eventName, callback) {
                eventPools[poolName] = eventPools[poolName] || {};
                eventPools[poolName][eventName] = eventPools[poolName][eventName] || [];
                // 根据回调函数判断是否已监听，不允许重复监听
                var notExist = eventPools[poolName][eventName].every(function (exsitCallback) {
                    return exsitCallback !==  callback
                });
                if(notExist){
                    eventPools[poolName][eventName].push(callback);
                }else {
                    throw new Error('iBus can not use a callback multiple under '+ eventName)
                }
            },
            off: function (poolName, eventName, callback) {
                eventPools[poolName] = eventPools[poolName] || {};
                eventPools[poolName][eventName] = eventPools[poolName][eventName] || [];
                eventPools[poolName][eventName].every(function (exsitCallback, index) {
                    if(exsitCallback !==  callback){
                        return true;
                    }else {
                        eventPools[poolName][eventName].splice(index, 1);
                        return false
                    }
                });
            },
            exsit: function (poolName, eventName) {
                eventPools[poolName] = eventPools[poolName] || {};
                return !!(eventPools[poolName][eventName] && eventPools[poolName][eventName].length)
            },
            asyncFunc: function (method){
                $q(function (resolve) {
                    resolve()
                }).then(method)
            }
        }

        /**
         *
         * @type {{$$emit: 派发事件, $$on: 监听事件, $$off: 解除监听, $$exsit: 是否存在}}
         * 所有方法中不带有privateName参数时，均为对公共事件池的操作
         * 带有privateName时，操作的为对应事件池,若无此事件池则会被创建
         */
        var bus = {
            $$emit: function (eventName, data, privateName) {
                // 保证同一controller中的所有事件都先被注册，所以异步触发事件
                tools.asyncFunc(function () {
                    if(!privateName){
                        tools.emit('publicPool', eventName, data);
                    }else {
                        tools.emit(privateName, eventName, data);
                    }
                })
            },
            $$on: function (eventName, callback, privateName) {
                if(!privateName){
                    tools.on('publicPool', eventName, callback);
                }else {
                    tools.on(privateName, eventName, callback);
                }
            },
            $$off: function (eventName, callback, privateName) {
                if(!privateName){
                    tools.off('publicPool', eventName, callback);
                }else {
                    tools.off(privateName, eventName, callback);
                }
            },
            // 判断公共事件池中是否已存在该类事件
            $$exsit: function (eventName, privateName) {
                if(!privateName){
                    tools.exsit('publicPool', eventName);
                }else {
                    tools.exsit(privateName, eventName);
                }
            }
        };


        return bus;
    }
})();
