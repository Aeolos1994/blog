/**
 * High Performance Tree
 * Auth: kongpei
 */
(function () {
  'use strict';
  angular.module('app').factory('iTreeDataResolve', [
      function () {
      /**
       * [resolve description]
       * @param  {[Array | Object]} treeData [树结构]
       * @param  {[Object]}         fieldMap [字段映射]
       * @return {[Object]}                  [返回值{节点映射表}]
       */
      var Reduction = 0;

      function resolve(treeData, options) {
        var mapper = {}
        var dataType = Object.prototype.toString.call(treeData)
        if (dataType === "[object Array]") {
          treeData.forEach(function (data) {
            // 设置默认的node show状态为true
            if (data[options.fieldMap.show] === undefined) {
              data[options.fieldMap.show] = true
            }
            setWatcher(data, options.watchKeys, idGenerator(data[options.fieldMap.id]))
            recursion(data, options, mapper)
          })
        } else if (dataType === "[object Object]") {
          // 设置默认的node show状态为true
          if (treeData[options.fieldMap.show] === undefined) {
            treeData[options.fieldMap.show] = true
          }
          setWatcher(treeData, options.watchKeys, idGenerator(treeData[options.fieldMap.id]))
          recursion(treeData, options, mapper)
        } else {
          throw new Error('tree data must be a type of Object or Array')
        }
        return mapper
      }
      /**
       * [recursion description]
       * @param  {[type]} data    [待递归的数据]
       * @param  {[type]} options [数据参数]
       * @param  {[type]} mapper  [数据打平结构的引用]
       * @param  {[type]} parent  [递归时的父节点]
       * @return {[type]}
       */
      function recursion(data, options, mapper, parent) {
        // 构建映射表
        mapper[data[options.fieldMap.id]] = data
        // 记录当前节点的所有父节点
        if (parent && parent.parentsPath) {
          data.parentsPath = Array.from(parent.parentsPath)
          data.parentsPath.push(parent[options.fieldMap.id])
        } else {
          data.parentsPath = []
        }
        // 递归 并记录当前节点的所有子节点
        data.childrenPath = []
        if (data[options.fieldMap.children] && data[options.fieldMap.children].length) {
          data[options.fieldMap.children].forEach(function (child) {
            // 设置默认的node show状态为true
            if (child[options.fieldMap.show] === undefined) {
              child[options.fieldMap.show] = true
            }
            setWatcher(child, options.watchKeys, idGenerator(child[options.fieldMap.id]))
            data.childrenPath = data.childrenPath.concat(recursion(child, options, mapper,
              data))
          })
        }
        var childrenPathCopy = Array.from(data.childrenPath)
        childrenPathCopy.push(data[options.fieldMap.id])
        return childrenPathCopy
      }
      /**
       * 为规定属性添加setter
       * @param {[Object]} node      [被监听的节点]
       * @param {[Object]} watchKeys [被监听的属性]
       * @param {[String]} idOnly    [唯一id]
       */
      function setWatcher(node, watchKeys, idOnly) {
        // 设置node的唯一Id映射dom
        node._$id = idOnly
        Object.entries(watchKeys).forEach(function (entry) {
          var key = entry[0],
            value = entry[1];
          Object.defineProperty(node, '_' + key, {
            value: node[key],
            writable: true,
            enumerable: false,
            configurable: false
          })
          // 没有设置过getter setter时才会设置
          var descriptor = Object.getOwnPropertyDescriptors(node)
          if(!descriptor[key] || !descriptor[key].get){
            var getterAndSetter = value(node)
            Object.defineProperty(node, key, {
              set: getterAndSetter.setter,
              get: getterAndSetter.getter
            })
          }
        })
      }
      /**
       * id生成器
       * @param  {[String]} id [原有id]
       * @return {[String]}    唯一id
       */
      function idGenerator(id) {
        return '_$' + Reduction++ + '_' + id
      }
      /**
       * [idParser id解析器]
       * @param  {[String]} id [唯一id]
       * @return {[String]}    [原有id]
       */
      function idParser(id) {
        return id.substr(id.lastIndexOf('_') + 1)
      }
      return {
        resolve: resolve,
        idParser: idParser
      }
    }]).directive('iTreeView', ['iTreeDataResolve', function (iTreeDataResolve) {
    return {
      restrict: 'E',
      scope: {
        /**
         * [itvTreeData description]
         * @type {Array}
         * 根节点可以有一个或多个
         * 无论一个还是多个传入要求均为数组形式
         */
        itvTreeData: '=',
        /**
         * [itvTreeOptions description]
         * @type {Object}
         * 默认值如下 会根据传入值增量替换
         * {
         *  expand: 'ibass-add-round',
         *  collapse: 'ibass-minus-round',
         *  leaf: 'ibass-dot',
         *  uncheck: 'ibass-checkbox',
         *  checked: 'ibass-checked'
         *  padding-left: '10px',
         *  list-class: 'listClas'
         *  hover-class: 'hoverClass'
         * }
         */
        itvTreeOptions: '=',
        /**
         * [itvTreeMapper description]
         * 字段映射表
         * @type {Object}
         */
        itvTreeMapper: '=',
        /**
         * [itvNodeExpandClick description]
         * 树节点的点击事件
         * mapper: {
         * id: 'id',
         * name: 'name',
         * children: 'children',
         * expand: 'expand',
         * checked: 'checked',
         * show: 'show'
         * }
         * @type {Function}
         */
        itvNodeClick: '&',
        /**
         * 初始化后向外提供nodeMapper
         * @type {Function}
         */
        itvGetNodesMapper: '&'
      },
      link: function ($scope, $element, $attrs) {
        var defaultOpt = {
          options: {
            'expandIcon': 'ibass-add-round',
            'collapseIcon': 'ibass-minus-round',
            'leafIcon': 'ibass-dot',
            'uncheckIcon': 'ibass-checkbox',
            'checkedIcon': 'ibass-checked',
            'list-class': '',
            'hover-class': ''
          },
          mapper: {
            id: 'id',
            name: 'name',
            children: 'children',
            expand: 'expand',
            checked: 'checked',
            show: 'show'
          }
        }

        function initStatus() {
          // 初始化options
          $scope.options = Object.assign(defaultOpt.options, $scope.itvTreeOptions)
          $scope.mapper = Object.assign(defaultOpt.mapper, $scope.itvTreeMapper)
        }

        function initData() {
          var options = {
            fieldMap: {
              id: $scope.mapper.id,
              children: $scope.mapper.children,
              show: $scope.mapper.show
            },
            watchKeys: getNodeWatchers()
          }
          $scope.nodesMapper = iTreeDataResolve.resolve($scope.itvTreeData, options)
          setTimeout(function () {
            $scope.itvGetNodesMapper && $scope.itvGetNodesMapper({
              nodesMapper: $scope.nodesMapper
            })
          }, 0)
        }
        /**
         * [渲染树结构 并挂载到$element上]
         * @return {[Undefined]}
         */
        function renderTree() {
          var wrap = document.createElement('div')
          wrap.className = 'i-tree-view-wrap'
          wrap.addEventListener('click', function (e) {
            var target = e.target
            var checkedRegExp =
              /(itv-node-name|itv-node-status-checked|itv-node-status-uncheck)/
            var expandRegExp = /(itv-node-status-expand|itv-node-status-collapse)/
            if (checkedRegExp.test(target.className)) {
              var id = iTreeDataResolve.idParser(target.parentNode.id)
              respondClickEvent('check', $scope.nodesMapper[id])
            } else if (expandRegExp.test(target.className)) {
              var id = iTreeDataResolve.idParser(target.parentNode.id)
              respondClickEvent('expand', $scope.nodesMapper[id])
            }
          })
          wrap.append(recursionBuildDom($scope.itvTreeData))
          $element.html('').append(wrap)
        }
        /**
         * 递归遍历TreeData 构建DomTreee
         * @param  {[Array]} nodes 节点子数据
         * @return {[Dom Object]}  构建后的Dom树
         */
        function recursionBuildDom(nodes) {
          var treeBranches = document.createElement('ul')
          treeBranches.className = 'i-tree-view-ul'
          nodes.forEach(function (node) {
            var treeBranch = document.createElement('li')
            setLiDomAttribute(treeBranch, node)
            setBranchInside(treeBranch, node)
            if (node[$scope.mapper.children] && node[$scope.mapper.children].length >
              0) {
              treeBranch.appendChild(recursionBuildDom(node[$scope.mapper.children]))
            }
            treeBranches.appendChild(treeBranch)
          })
          return treeBranches
        }
        /**
         * 设置每个树节点的属性
         * @param {[Dom Object]} dom  树节点对应的dom
         * @param {[Object]} node 树节点的数据
         */
        function setLiDomAttribute(dom, node) {
          dom.className = 'itv-list'
          dom.className += node.expand ? ' itv-list-expand' : ''
          dom.style.display = !!node[$scope.mapper.show] ? 'block' : 'none'
          dom.id = node._$id
        }
        /**
         * 设置每个节点的内部Dom结构
         * @param {[Dom Object]} branch 节点dom
         * @param {[Object]} node   节点数据
         */
        function setBranchInside(branch, node) {
          var status = getBranchStatus(node)
          status.branchStatus.forEach(function (status) {
            var statusIcon = document.createElement('i')
            statusIcon.className = status.icon + ' ' + status.class
            statusIcon.style.display = !!status.condition ? 'inline-block' : 'none'
            branch.appendChild(statusIcon)
          })
          var branchName = document.createElement('span')
          branchName.innerHTML = node[$scope.mapper.name]
          branchName.className = 'itv-node-name'
          branch.appendChild(branchName)
          status.branchChecked.forEach(function (checked) {
            var checkedIcon = document.createElement('i')
            checkedIcon.className = checked.icon + ' ' + checked.class
            checkedIcon.style.display = !!checked.condition ? 'inline-block' : 'none'
            branch.appendChild(checkedIcon)
          })
        }
        /**
         * 根据数据获取当前节点状态
         * @param  {[Object]} node 节点数据
         * @return {[Object]}      节点信息与状态
         */
        function getBranchStatus(node) {
          return {
            branchStatus: [
              {
                icon: $scope.options.leafIcon,
                class: 'itv-node-status-leaf',
                condition: !node[$scope.mapper.children] || !node[$scope.mapper.children]
                  .length
                      },
              {
                icon: $scope.options.collapseIcon,
                class: 'itv-node-status-expand',
                condition: node[$scope.mapper.children] && node[$scope.mapper.children]
                  .length && node[$scope.mapper.expand]
                      },
              {
                icon: $scope.options.expandIcon,
                class: 'itv-node-status-collapse',
                condition: node[$scope.mapper.children] && node[$scope.mapper.children]
                  .length && !node[$scope.mapper.expand]
                      }
                    ],
            branchChecked: [
              {
                icon: $scope.options.checkedIcon,
                class: 'itv-node-status-checked',
                condition: node[$scope.mapper.checked]
                      },
              {
                icon: $scope.options.uncheckIcon,
                class: 'itv-node-status-uncheck',
                condition: !node[$scope.mapper.checked]
                      }
                    ]
          }
        }
        /**
         * 获取每个节点的Data Watcher
         * 在规定的数据发生变更时会触发这些watcher
         * @return {[Object]} watcher回调映射对象
         */
        function getNodeWatchers() {
          var watcher = {}
          Object.entries($scope.mapper).forEach(function (entry) {
            var key = entry[0],
              value = entry[1];
            switch (key) {
            case 'name':
              {
                watcher[value] = function (node) {
                  return {
                    setter: function (val) {
                      console.log('change')
                      document.getElementById(node._$id).innerHTML = val
                      node['_' + value] = val
                    },
                    getter: function () {
                      return node['_' + value]
                    }
                  }
                }
                break
              }
            case 'show':
              {
                watcher[value] = function (node) {
                  return {
                    setter: function (val) {
                      var v = !!val
                      document.getElementById(node._$id).style.display = v ?
                        'block' : 'none'
                      node['_' + value] = v
                    },
                    getter: function () {
                      return !!node['_' + value]
                    }
                  }
                }
                break
              }
            case 'expand':
              {
                watcher[value] = function (node) {
                  return {
                    setter: function (val) {
                      var v = !!val
                      var children = getChildrenOfList(document.getElementById(node
                        ._$id))
                      var childrenPath = node[$scope.mapper.children]
                      var ele = document.getElementById(node._$id)
                      if (v) {
                        if (!ele.className.includes('itv-list-expand')) {
                          ele.className += ' itv-list-expand'
                        }
                        if (childrenPath && childrenPath.length) {
                          children.expand.style.display = 'inline-block'
                          children.collapse.style.display = 'none'
                        }
                      } else {
                        var className = ele.className
                        ele.className = className.replace(' itv-list-expand', '')
                        if (childrenPath && childrenPath.length) {
                          children.collapse.style.display = 'inline-block'
                          children.expand.style.display = 'none'
                        }
                      }
                      node['_' + value] = val
                    },
                    getter: function () {
                      return !!node['_' + value]
                    }
                  }
                }
                break
              }
            case 'checked':
              {
                watcher[value] = function (node) {
                  return {
                    setter: function (val) {
                      var v = !!val
                      var children = getChildrenOfList(document.getElementById(node
                        ._$id))
                      children.checked.style.display = v ? 'inline-block' : 'none'
                      children.uncheck.style.display = !v ? 'inline-block' : 'none'
                      node['_' + value] = val
                    },
                    getter: function () {
                      return !!node['_' + value]
                    }
                  }
                }
                break
              }
            }
          })
          return watcher
        }
        /**
         * 响应dom节点的点击事件
         * @param  {[String]} type 点击触发的事件类型 [选中或展开]
         * @param  {[Object]} node 触发点击事件的数据节点
         * @return {[type]}      [description]
         */
        function respondClickEvent(type, node) {
          if (type === 'check') {
            // node[$scope.mapper.checked] = !node[$scope.mapper.checked]
            // node.childrenPath.forEach(function (childId) {
            //   $scope.nodesMapper[childId][$scope.mapper.checked] = node[$scope.mapper.checked]
            // })
            $scope.itvNodeClick({
              node: node,
              type: type,
              mapper: $scope.nodesMapper
            })
          } else if (type === 'expand') {
            node[$scope.mapper.expand] = !node[$scope.mapper.expand]
          }
        }
        /**
         * 获取List Dom节点的所有子节点映射
         * @param  {[Dom Object]} dom List Dom节点
         * @return {[Object]}     mapper
         */
        function getChildrenOfList(dom) {
          var childrenObj = {}
          dom.childNodes.forEach(function (childNode) {
            if (childNode.className.includes('itv-node-status-checked')) {
              childrenObj.checked = childNode
            }
            if (childNode.className.includes('itv-node-status-uncheck')) {
              childrenObj.uncheck = childNode
            }
            if (childNode.className.includes('itv-node-status-leaf')) {
              childrenObj.leaf = childNode
            }
            if (childNode.className.includes('itv-node-status-expand')) {
              childrenObj.expand = childNode
            }
            if (childNode.className.includes('itv-node-status-collapse')) {
              childrenObj.collapse = childNode
            }
            if (childNode.className.includes('itv-node-name')) {
              childrenObj.name = childNode
            }
          })
          return childrenObj
        }

        function isObject(data) {
          return Object.prototype.toString.call(data) === '[object Object]'
        }
        $scope.$watch("itvTreeData", function () {
          // 判断当前传入数据有值
          if ($scope.itvTreeData && (isObject($scope.itvTreeData) || Array.isArray($scope.itvTreeData))) {
            if((isObject($scope.itvTreeData) && Object.keys($scope.itvTreeData).length) || $scope.itvTreeData.length){
              initStatus()
              initData()
              renderTree()
            }else {
              $element.html('')
            }
          } else {
            throw new Error('unexpect itvTreeData value, expect Array or Object')
          }
        })
      }
    }
    }]);
})();
