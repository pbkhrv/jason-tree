/**
 *  ExpressJS middleware wrap of jasontree functionality
 *
 *  Inspired by (and partially copied from) https://github.com/expressjs/serve-index
 */

var jt = require('./jasontree.js');
var http = require('http');

exports = module.exports = function jasonTree(tree) {
  tree = jt.tree(tree || {});

  function processGetTree(treePath) {
    return {
      value: jt.get(tree, treePath)
    };
  };

  function processPutTree(treePath, value) {
    tree = jt.put(tree, treePath, value)
    return {
      lastPutPath: jt.lastPutPath(tree)
    }; 
  };

  function reply(res, obj) {
    var buf = new Buffer(JSON.stringify(obj), 'utf8');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
  };
 
  function createError(code, msg) {
    var err = new Error(msg || http.STATUS_CODES[code]);
    err.status = code;
    return err;
  };

  return (function(req, res, next) {
    var treePath = req.path;
    console.log('>', req.method, treePath);
    if (req.method === 'GET') {
      var r = processGetTree(treePath);
      console.log('<', JSON.stringify(r), "\n");
      reply(res, r);
    }
    else if (req.method === 'PUT') {
      console.log('>', req.body);
      var data = req.body;
      if (!data || !data.value) {
        return next(createError(400, 'Body must be a JSON object with a \'value\' property'));
      }
      var r = processPutTree(treePath, data.value);
      console.log('<', JSON.stringify(r), "\n");
      reply(res, r);
    }
    else {
      res.setHeader('Allow', 'GET, PUT');
      res.end();
      return;
    }
  });
};
