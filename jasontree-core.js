(function(exports) {
  var _ = require('lodash');
  var uuid = require('node-uuid');
  var EventEmitter = require('events').EventEmitter;

  exports.tree = function(obj) {
    var tree = obj ? obj : {};
    return {
      tree: tree,
      eventEmitter: new EventEmitter()
    };
  };

  function getOp(treeObj, path) {
    if (!_.isArray(path)) {
      path = pathElements(path);
    }
    return getFromSubtreePath(treeObj.tree, path);
  };
  exports.get = getOp;

  function getNodeByKey(node, key) {
    if (!key || !node) {
      return undefined;
    }
    if (key === '$$last$$') {
      if (_.isArray(node)) {
        return node[node.length-1];
      }
      else {
        throw 'Can only access array using $$last$$';
      }
    }
    else {
      return node[key];
    }
  };

  function getFromSubtreePath(subtree, pathElements) {
    var key = _.head(pathElements);
    var node = getNodeByKey(subtree, key);
    if (pathElements.length > 1) {
      return getFromSubtreePath(node, _.tail(pathElements));
    }
    else {
      return node;
    }
  };

  exports.putOld = function(treeObj, path, value) {
    if (!_.isArray(path)) {
      path = pathElements(path);
    }
    var putOpPath = [];
    var tec = new TreeEventCollector('put', treeObj.eventEmitter, treeObj);
    treeObj.tree = putIntoTreeOnPath(treeObj.tree, path, putOpPath, value, tec.collect.bind(tec));
    treeObj.putOpPath = putOpPath;
    tec.process(treeObj.doneNotifyingCb); // hack for testing ...
    return treeObj;
  };

  exports.put = function(treeObj, path, value) {
    path = interpolatedPathArray(path);
    treeObj.tree = _.compose(
      returnUpdatedTree,
      emitNodeCreationEvents(treeObj.eventEmitter, treeObj.doneNotifyingCb),
      listCreatedNodes(value),
      insertAsLeaf(value),
      createNewPath,
      traverseExistingPath
    )(requestedPathInTree(path, treeObj.tree));
    treeObj.putOpPath = path;
    return treeObj;
  };

  function tap(msg) {
    return function(acc) {
      console.log('tap', msg, acc);
      return acc;
    }
  };

  function requestedPathInTree(path, tree) {
    return {
      requestedPath: path,
      newPath: path,
      commonPath: [],
      rootNode: tree,
      lastExistingNode: tree,
      lastNewNode: undefined,
      earliestNewNode: undefined
    };
  };

  function returnUpdatedTree(acc) {
    return acc.rootNode;
  };

  function listCreatedNodes(value) {
    return function(acc) {
      var paths = [];
      _.reduce(acc.newPath, function(path, pathKey) {
        path.push(pathKey);
        paths.push(_.clone(path));
        return path;
      }, _.clone(acc.commonPath));
      acc.allCreatedPaths = paths.concat(enumeratePathsInObject(value, acc.requestedPath));
      return acc;
    };
  };

  function emitNodeCreationEvents(emitter, doneFn) {
    return function(acc) {
      if (emitter.listeners('put').length > 0) {
        setTimeout(function() {
          _.each(acc.allCreatedPaths, function(path) {
            pathStr = '/' + path.join('/');
            emitter.emit('put', pathStr);
          });
          if (doneFn) doneFn();
        }, 1);
      }
      return acc;
    };
  };

  function enumeratePathsInObject(value, pathSoFar) {
    if (_.isArray(value) && value.length > 0) {
      pathSoFar = pathSoFar.concat("$$last$$");
      return [pathSoFar].concat(enumeratePathsInObject(_.last(value), pathSoFar));
    }
    else if (_.isObject(value)) {
      return _.reduce(_.keys(value), function(paths, pathKey) {
        var newPath = pathSoFar.concat(pathKey);
        paths.push(newPath);
        return paths.concat(enumeratePathsInObject(value[pathKey], newPath));
      }, []);
    }
    else {
      return [];
    }
  };

  function traverseExistingPath(acc) {
    return _.transform(acc.requestedPath, function(acc, pathKey) {
      if (!_.isArray(acc.lastExistingNode) && !_.isObject(acc.lastExistingNode)) {
        throw 'Can\'t traverse non-array non-object node';
      }

      var nextNode = undefined;

      if (_.isArray(acc.lastExistingNode) && pathKey === '$$last$$' && acc.newPath.length > 1) {
        nextNode = _.last(acc.lastExistingNode);
      }
      else if (_.isObject(acc.lastExistingNode)) {
        nextNode = acc.lastExistingNode[pathKey];
      }

      if (nextNode) {
        acc.newPath = _.tail(acc.newPath);
        acc.commonPath.push(pathKey);
        acc.lastExistingNode = nextNode;
        return true;
      }
      else {
        return false;
      }
    }, acc);
  };

  function createNewPath(acc) {
    return _.reduce(_.initial(_.clone(acc.newPath).reverse()), function(acc, pathKey) {

      var newNode = (pathKey === '$$last$$') ? [] : {};

      if (acc.earliestNewNode) {
        if (pathKey === '$$last$$') {
          newNode.push(acc.earliestNewNode);
        }
        else {
          newNode[pathKey] = acc.earliestNewNode;
        }
        acc.earliestNewNode = newNode;
      }
      else {
        acc.earliestNewNode = newNode;
        acc.lastNewNode = newNode;
      }

      return acc;
    }, acc);
  };

  function insertAsLeaf(value) {
    return function(acc) {
      var lastNode = acc.lastNewNode || acc.lastExistingNode || acc.rootNode;
      var lastKey = _.last(acc.requestedPath);
      nodeInsert(lastNode, lastKey, value);
      if (acc.lastExistingNode && acc.earliestNewNode) {
        nodeInsert(acc.lastExistingNode, _.first(acc.newPath), acc.earliestNewNode);
      }
      return acc;
    }
  }

  function nodeInsert(node, key, value) {
    if (_.isArray(node) && key === '$$last$$') {
      node.push(value);
    }
    else if (_.isObject(node)) {
      node[key] = value;
    }
    else {
      throw 'Cannot insert value into non-object node or not-last-position-in-array';
    }
  }

  exports.lastPutPath = function(treeObj) {
    return treeObj.putOpPath;
  };

  function TreeEventCollector(evtName, eventEmitter, treeObj) {
    var paths = [];

    this.collect = function(pathElements) {
      paths.push(_.clone(pathElements));
    };

    this.process = function(done) {
      setTimeout(function() {
        notifyListeners();
        if (done) done();
      }, 1);
    };

    function notifyListeners() {
      if (eventEmitter.listeners(evtName).length > 0) {
        _.each(paths, function(path) {
          pathStr = '/' + path.join('/');
          eventEmitter.emit(evtName, pathStr);
        });
      }
    };
  };

  function putIntoTreeOnPath(container, path, putOpPath, value, createdCb) {
    var key = _.head(path);
    if (path.length == 1) {
      if (putOpPath) putOpPath.push(key);
      return putValueOnPathKey(container, key, value, putOpPath, createdCb);
    }
    else {
      var subContainer = getNextSubcontainerNode(container, key);
      if (subContainer) {
        if (putOpPath) {
          putOpPath.push(key);
        }
        putIntoTreeOnPath(subContainer, _.tail(path), putOpPath, value, createdCb);
        return container;
      }
      else {
        if (putOpPath) {
          putOpPath.push(key);
        }
        subContainer = createNextSubcontainerNode(container, path);
        // stop propagating putOpPath
        subContainer = putIntoTreeOnPath(subContainer, _.tail(path), undefined, value, createdCb);
        return putValueOnPathKey(container, key, subContainer, putOpPath, createdCb);
      }
    }
  };

  function getNextSubcontainerNode(container, key) {
    if (_.isArray(container)) {
      if (key === '$$last$$' && container.length > 0) {
        return container[container.length - 1];
      }
    }
    else if (_.isObject(container) && !_.isArray(container)) {
      if (container[key]) {
        return container[key];
      }
    }
    return undefined;
  }

  function createNextSubcontainerNode(container, path) {
    var nextKey = _.head(_.tail(path));
    if (_.isArray(container) || _.isObject(container)) {
      return (nextKey === '$$last$$') ? [] : {};
    }
    else {
      throw 'Unknown node container type';
    }
  };

  function putValueOnPathKey(container, key, value, putOpPath, createdCb) {
    if (_.isArray(container)) {
      if (key === '$$last$$') {
        container.push(value);
      }
      else {
        throw 'Can only append to arrays using $$last$$';
      }
    }
    else if (_.isObject(container)) {
      if (!container[key]) {
        container[key] = value;
      }
      else {
        throw 'Cannot overwrite existing value. key:' + key;
      }
    }
    else {
      throw 'Cannot insert value into a non-container node ' + container;
    }

    createdCb(putOpPath);
    recurseCreatedCb(value, createdCb, putOpPath);

    return container;
  };

  function recurseCreatedCb(value, createdCb, pathSoFar) {
    if (_.isArray(value) && value.length > 0) {
      var p = pathSoFar.concat("$$last$$");
      createdCb(p);
      recurseCreatedCb(value[value.length-1], createdCb, p);
    }
    else if (_.isObject(value)) {
      _.forEach(_.keys(value), function(k) {
        var p = pathSoFar.concat(k);
        createdCb(p);
        recurseCreatedCb(value[k], createdCb, p);
      });
    }
  };

  function pathElements(path) {
    var elements = path.split('/');
    return _(elements)
      .reject(_.isEmpty)
      .map(function(e) {
        return (e === '$$uuid$$') ? uuid.v4() : e;
      })
      .value();
  };

  function interpolatedPathArray(path) {
    var elements = _.isArray(path) ? path : path.split('/');
    return _(elements)
      .reject(_.isEmpty)
      .map(function(e) {
        return (e === '$$uuid$$') ? uuid.v4() : e;
      })
      .value();
  };

  function regexFromPathPattern(pattern) {
    pattern = pattern.replace(/\$\$anyKey\$\$/g, '([^/]+?)');
    pattern = pattern.replace(/\$\$anyPath\$\$\//g, '((.+)/)*');
    pattern = pattern.replace(/\$\$anyPath\$\$$/, '((.+)/)*([^/]+?)');
    pattern = pattern.replace(/\$\$last\$\$/g, '\\$\\$last\\$\\$');
    pattern = '^' + pattern + '$';
    return pattern;
  }
  // what's a better way to expose this for testing? class? module?
  exports.regexFromPathPattern = regexFromPathPattern;

  exports.on = function(treeObj, evtName, pattern, callback) {
    if (evtName !== 'put') throw 'Can only listen on \'put\' events';
    var rex = regexFromPathPattern(pattern);
    var listener = function(path) {
      if (path.match(rex)) {
        callback(path, getOp(treeObj, path));
      }
    }
    treeObj.eventEmitter.on(evtName, listener);
  };
})(exports);
