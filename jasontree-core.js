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

  exports.on = function(treeObj, evtName, listener) {
    return treeObj.eventEmitter.on(evtName, listener);
  };

  exports.get = function(treeObj, path) {
    if (!_.isArray(path)) {
      path = pathElements(path);
    }
    return getFromSubtreePath(treeObj.tree, path);
  };

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

  exports.put = function(treeObj, path, value) {
    if (!_.isArray(path)) {
      path = pathElements(path);
    }
    var putOpPath = [];
    var tec = new TreeEventCollector('treeNodeCreated', treeObj.eventEmitter, treeObj);
    treeObj.tree = putIntoTreeOnPath(treeObj.tree, path, putOpPath, value, tec.collect.bind(tec));
    treeObj.putOpPath = putOpPath.reverse();
    tec.process(treeObj.doneNotifyingCb); // hack for testing ...
    return treeObj;
  };

  exports.lastPutPath = function(treeObj) {
    return treeObj.putOpPath;
  };

  function TreeEventCollector(evtName, eventEmitter, treeObj) {
    var events = [];

    this.collect = function(pathElements) {
      events.push(_.clone(pathElements));
    };

    this.process = function(done) {
      //console.log("notifying listeners");
      setTimeout(function() {
        notifyListeners();
        if (done) {
          done();
        }
      }, 1);
    };

    function notifyListeners() {
      //console.log("TIMEOUT FIRED");
      if (eventEmitter.listeners(evtName).length > 0) {
        //console.log("got listeners");
        _.each(events, function(evt) {
          //console.log("emitting", evtName, evt);
          eventEmitter.emit(evtName, evt);
        });
      }
    };
  };

  function putIntoTreeOnPath(container, path, putOpPath, value, createdCb) {
    var key = _.head(path);
    if (path.length == 1) {
      return putValueOnPathKey(container, key, value, putOpPath, createdCb);
    }
    else {
      var subContainer = getNextSubcontainerNode(container, key);
      if (subContainer) {
        putIntoTreeOnPath(subContainer, _.tail(path), putOpPath, value, createdCb);
        putOpPath.push(key);
        return container;
      }
      else {
        subContainer = createNextSubcontainerNode(container, path);
        subContainer = putIntoTreeOnPath(subContainer, _.tail(path), putOpPath, value, createdCb);
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
      if (key !== '$$uuid$$' && container[key]) {
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
      if (key === '$$uuid$$') {
        key = uuid.v4();
      }
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

    putOpPath.push(key);
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
    return _.reject(elements, _.isEmpty);
  };
})(exports);
