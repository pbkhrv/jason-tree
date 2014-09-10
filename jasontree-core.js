(function(exports) {
  var _ = require('lodash');
  var uuid = require('node-uuid');

  exports.tree = function(obj) {
    var tree = obj ? obj : {};
    return {
      tree: tree
    };
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
    treeObj.tree = putIntoTreeOnPath(treeObj.tree, path, putOpPath, value);
    treeObj.putOpPath = putOpPath.reverse();
    return treeObj;
  };

  exports.lastPutPath = function(treeObj) {
    return treeObj.putOpPath;
  };

  function putIntoTreeOnPath(container, path, putOpPath, value) {
    var key = _.head(path);
    if (path.length == 1) {
      return putValueOnPathKey(container, key, value, putOpPath);
    }
    else {
      var subContainer = getNextSubcontainerNode(container, key);
      if (subContainer) {
        putIntoTreeOnPath(subContainer, _.tail(path), putOpPath, value);
        putOpPath.push(key);
        return container;
      }
      else {
        subContainer = createNextSubcontainerNode(container, path);
        subContainer = putIntoTreeOnPath(subContainer, _.tail(path), putOpPath, value);
        return putValueOnPathKey(container, key, subContainer, putOpPath);
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

  function putValueOnPathKey(container, key, value, putOpPath) {
    if (_.isArray(container)) {
      if (key === '$$last$$') {
        putOpPath.push(key);
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
        putOpPath.push(key);
      }
      else {
        throw 'Cannot overwrite existing value. key:' + key;
      }
    }
    else {
      throw 'Cannot insert value into a non-container node ' + container;
    }
    return container;
  };

  function pathElements(path) {
    var elements = path.split('/');
    return _.reject(elements, _.isEmpty);
  };
})(exports);
