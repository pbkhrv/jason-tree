var jt = require('./jasontree-core.js');
var lodash = require('lodash');

describe('Query data by path in the tree', function() {
  beforeEach(function() {
    this.tree = jt.tree({
      users: {
        bobby: {
          firstName: 'Bob'
        },
        alice: {
          firstName: 'Alice',
          books: ['Alice in Wonderland']
        }
      }
    });
  });

  it('can retrieve primitives', function() {
    var firstName = jt.get(this.tree, '/users/bobby/firstName');
    expect(firstName).toEqual('Bob');
  });

  it('can retrieve objects', function() {
    var user = jt.get(this.tree, '/users/bobby');
    expect(user).toEqual({
      firstName: 'Bob'
    });
  });

  it('can retrieve arrays', function() {
    var books = jt.get(this.tree, '/users/alice/books');
    expect(books).toEqual(['Alice in Wonderland']);
  });

  it('is safe to access non-existent nodes', function() {
    var noSuchThing = jt.get(this.tree, '/no/such/path/in/this/tree');
    expect(noSuchThing).not.toBeDefined();
  });

  it('can accept path as an array of key names', function() {
    var books = jt.get(this.tree, ['users', 'alice', 'books']);
    expect(books).toEqual(['Alice in Wonderland']);
  });
});

describe('Insert data at some path', function() {
  beforeEach(function() {
    this.tree = jt.tree();
    this.getTree = function(path) {
      return jt.get(this.tree, path);
    };
  });

  it('can insert primitives', function() {
    jt.put(this.tree, '/users/bobby/firstName', 'Bob');
    expect(this.getTree('/users/bobby/firstName')).toEqual('Bob');
  });

  it('can insert objects', function() {
    jt.put(this.tree, '/users/bobby', {
      firstName: 'Bob'
    });
    expect(this.getTree('/users/bobby/firstName')).toEqual('Bob');
  });

  it('can insert arrays', function() {
    jt.put(this.tree, '/users/alice/books', ['Alice in Wonderland']);
    expect(this.getTree('/users/alice/books')).toEqual(['Alice in Wonderland']);
  });

  it('should not overwrite existing nodes', function() {
    jt.put(this.tree, '/users/bobby', {
      firstName: 'Bob'
    });

    var overwrite = function() {
      jt.put(this.tree, '/users/bobby', {
        firstName: 'John'
      });
    };
    expect(overwrite).toThrow();
  });

  it('can insert primitives on any level in the tree above root', function() {
    jt.put(this.tree, '/count', 5);
    expect(this.getTree('/count')).toEqual(5);
  });

  it('can insert leaf nodes on existing paths', function() {
    jt.put(this.tree, '/users', {});
    jt.put(this.tree, '/users/bobby', {});
    jt.put(this.tree, '/users/bobby/firstName', 'Bob');
    expect(this.getTree('/users/bobby/firstName')).toEqual('Bob');
  });
});

describe('Generate unique keys when inserting data', function() {
  it('generates unique id when $$uuid$$ is mentioned in path', function() {
    var tree = jt.put(jt.tree(), '/users/$$uuid$$', {
      firstName: 'Bob',
      lastName: 'Smith'
    });
    var userId = jt.lastPutPath(tree)[1];
    expect(userId).toBeDefined();
    expect(jt.get(tree, ['users', userId, 'firstName'])).toEqual('Bob');
  });

  it('generates different unique id for each $$uuid$$ in path', function() {
    var tree = jt.put(jt.tree(), '/users/$$uuid$$/books/$$uuid$$', {
      name: 'Alice in Wonderland',
      author: 'Lewis Carroll'
    });
    var userId = jt.lastPutPath(tree)[1];
    var bookId = jt.lastPutPath(tree)[3];
    expect(jt.get(tree, ['users', userId, 'books', bookId, 'author'])).toEqual('Lewis Carroll');
  });

  xit('should accept $$uuid$$ in JSON when inserting data', function() {
    var tree = jt.put(jt.tree(), '/users/bobby', {
      firstName: 'Bob',
      lastName: 'Smith',
      friends: ['$$uuid$$', '$$uuid$$']
    });
    var friendIds = jt.get(tree, '/users/bobby/friends');
    expect(friendIds.length).toEqual(2);
    expect(friendIds[0]).not.toEqual('$$uuid$$');
    expect(friendIds[1]).not.toEqual('$$uuid$$');
    expect(friendIds[0]).not.toEqual(friendIds[1]);
  });
});

xdescribe('Merging of trees', function() {
  beforeEach(function() {
    this.tree = jt.tree({
      users: {
        bobby: {
          firstName: 'Bob',
          middleName: 'Maria'
        }
      }
    });

    this.treeGet = function(path) {
      return jt.get(this.tree, path);
    };
  });

  it('should insert new data and ignore existing data', function() {
    this.tree = jt.merge(this.tree, '/', {
      users: {
        bobby: {
          firstName: 'Bob',
          lastName: 'Smith'
        }
      }
    });

    expect(this.treeGet('/users/bobby')).toEqual({
      firstName: 'Bob',
      middleName: 'Maria',
      lastName: 'Smith'
    })
  });

  it('should not allow overwrites of existing data', function() {
    var overwrite = function() {
      this.tree = jt.merge(this.tree, '/', {
        users: {
          bobby: {
            firstName: 'John',
            lastName: 'Smith'
          }
        }
      });
    };
    expect(overwrite).toThrow();
  });

  it('should be able to merge a sub-tree', function() {
    this.tree = jt.merge(this.tree, '/users/bobby', {
      lastName: 'Smith',
      books: ['Alice in Wonderland']
    });
    expect(this.treeGet('/users/bobby/books')).toEqual(['Alice in Wonderland']);
  });
});

describe('Array operations', function() {
  beforeEach(function() {
    this.tree = jt.tree({
      users: {
        bobby: {
          friendsNames: ['John', 'Maria']
        }
      }
    });
  });

  it('should get last element from array if $$last$$ is used in path', function() {
    expect(jt.get(this.tree, '/users/bobby/friendsNames/$$last$$')).toEqual('Maria');
  });

  it('should append to array if $$last$$ is the last part of the path', function() {
    this.tree = jt.put(this.tree, '/users/bobby/friendsNames/$$last$$', 'Alice');
    expect(jt.get(this.tree, '/users/bobby/friendsNames')).toEqual(['John', 'Maria', 'Alice']);
  });

  xit('should accept $$last$$ in JSON when inserting data', function() {
    this.tree = jt.put(this.tree, '/users/bobby/friendsNames', ['$$last$$', 'Alice', 'Bonny']);
    expect(jt.get(this.tree, '/users/bobby/friendsNames')).toEqual(['John', 'Maria', 'Alice', 'Bonny']);
  });

  it('should create array if it doesnt exist when $$last$$ is used', function() {
    this.tree = jt.put(this.tree, '/users/bobby/booksRead/$$last$$', 'Alice in Wonderland');
    expect(jt.get(this.tree, '/users/bobby/booksRead')).toEqual(['Alice in Wonderland']);
  });

  it('should not insert into $$last$$ position if its not last part of the path', function() {
    var tree = jt.tree({
      users: [
        {
          firstName: 'John'
        }
      ]
    });
    tree = jt.put(tree, '/users/$$last$$/lastName', 'Smith');
    expect(jt.get(tree, '/users/$$last$$')).toEqual({
      firstName: 'John',
      lastName: 'Smith'
    });
  });
});

describe('Callback when new node is created', function() {
  beforeEach(function(done) {
    var tree = jt.tree({
      users: {
        bobby: {
        }
      }
    });

    this.bobbyFirstNameCb = jasmine.createSpy('bobbyFirstNameCb');
    this.anyNewUserCb = jasmine.createSpy('anyNewUserCb');
    this.anyLastNameCb = jasmine.createSpy('anyLastNameCb');

    jt.on(tree, 'put', '/users/bobby/firstName', this.bobbyFirstNameCb);
    jt.on(tree, 'put', '/users/$$anyKey$$', this.anyNewUserCb);
    jt.on(tree, 'put', '$$anyPath$$/lastName', this.anyLastNameCb);

    tree.doneNotifyingCb = lodash.after(2, done);

    jt.put(tree, '/users/bobby/firstName', 'Bob');
    jt.put(tree, '/users/alice/lastName', 'Smith');
  });

  it('is called when new node matches path', function() {
    expect(this.bobbyFirstNameCb).toHaveBeenCalledWith('/users/bobby/firstName', 'Bob');
  });

  it('is called when new node matches path pattern with $$anyKey$$', function() {
    expect(this.anyNewUserCb).toHaveBeenCalledWith('/users/alice', {lastName: 'Smith'});
  });

  it('is called when new node matches path pattern with $$anyPath$$', function() {
    expect(this.anyLastNameCb).toHaveBeenCalledWith('/users/alice/lastName', 'Smith');
  });
});

xdescribe('Callbacks when object is inserted', function() {
  beforeEach(function(done) {
    var tree = jt.tree({});
    this.spyPut = jasmine.createSpy('spyPut');
    jt.on(tree, 'put', '/$$anyPath$$', this.spyPut);
    jt.on(tree, 'put', '/$$anyPath$$', console.log);
    tree.doneNotifyingCb = done;

    this.obj = {
      bobby: {
        friends: [
          {
            name: 'Somebody'
          },
          {
            name: 'Alice'
          }
        ]
      }
    };

    jt.put(tree, '/users', this.obj);
  });

  it('called for each part of the path when pattern is set to anyPath', function() {
    expect(this.spyPut).toHaveBeenCalledWith('/users', this.obj);
    expect(this.spyPut).toHaveBeenCalledWith('/users/bobby', this.obj.bobby);
    expect(this.spyPut).toHaveBeenCalledWith('/users/bobby/friends', this.obj.bobby.friends);
    expect(this.spyPut).toHaveBeenCalledWith('/users/bobby/friends/$$last$$', this.obj.bobby.friends[1]);
    expect(this.spyPut).toHaveBeenCalledWith('/users/bobby/friends/$$last$$/name', this.obj.bobby.friends[1].name);
  });
});

describe('Promise tied to new node creation', function() {
  beforeEach(function(done) {
    var tree = jt.tree({
      users: {
      }
    });

    this.firstNameCb = jasmine.createSpy('firstNameCb');

    jt.when(tree, 'put', '/users/$$anyKey$$/firstName').then(function(value) {
      this.firstNameCb(value);
    }.bind(this));

    tree.doneNotifyingCb = lodash.after(2, done);

    jt.put(tree, '/users/$$uuid$$/firstName', 'Bob');
    jt.put(tree, '/users/$$uuid$$/firstName', 'Alice');
  });

  xit('is resolved once', function() {
    expect(this.firstNameCb.calls.count()).toEqual(1);
  });

  xit('is resolved and is passed one of the inserted values', function() {
    expect(this.firstNameCb.calls.mostRecent().args(0)).toMatch(/Bob|Alice/);
  });
});

describe('Path pattern matching logic', function() {
  it('should match path without globs', function() {
    rex = jt.regexFromPathPattern("/this/is/a/path");
    expect("/this/is/a/path".match(rex)).toBeTruthy();
    expect("/this/is/a/path/different".match(rex)).toBeFalsy();
  });

  it('should match /end/of/path/$$anyKey$$ at the end of the path', function() {
    rex = jt.regexFromPathPattern("/end/of/path/$$anyKey$$");
    // match
    expect("/end/of/path/someKey".match(rex)).toBeTruthy();
    // no match
    expect("/end/of/path/what/someKey".match(rex)).toBeFalsy();
  });

  it('should match /user/$$anyKey$$/firstName', function() {
    rex = jt.regexFromPathPattern("/user/$$anyKey$$/firstName");
    expect("/user/bobby/firstName".match(rex)).toBeTruthy();
    expect("/notuser/bobby/firstName".match(rex)).toBeFalsy();
    expect("/user/bobby/lastName".match(rex)).toBeFalsy();
    expect("/user/bobby/nested/firstName".match(rex)).toBeFalsy();
  });

  it('$$anyKey$$ shouldn\'t match empty string', function() {
    rex = jt.regexFromPathPattern("/user/$$anyKey$$/firstName");
    expect("/user//firstName".match(rex)).toBeFalsy();
    expect("/user/firstName".match(rex)).toBeFalsy();
  });

  it('should match multiple $$anyKey$$ in path', function() {
    var rex = jt.regexFromPathPattern("/user/$$anyKey$$/friend/$$anyKey$$/firstName");
    // match
    expect("/user/bobby/friend/alice/firstName".match(rex)).toBeTruthy();
    // no match
    expect("/user/bobby/friend/alice/another".match(rex)).toBeFalsy();
  });

  it('should match /user/$$anyPath$$/lastName', function() {
    var rex = jt.regexFromPathPattern("/user/$$anyPath$$/lastName");
    // match
    expect("/user/bobby/lastName".match(rex)).toBeTruthy();
    expect("/user/bobby/friends/alice/lastName".match(rex)).toBeTruthy();
    // no match
    expect("/notuser/bobby/lastName".match(rex)).toBeFalsy();
    expect("/bobby/lastName".match(rex)).toBeFalsy();
    expect("/user/bobby/notLastName".match(rex)).toBeFalsy();
  });

  it('$$anyPath$$ should match empty string', function() {
    var rex = jt.regexFromPathPattern("/user/$$anyPath$$/lastName");
    expect("/user/lastName".match(rex)).toBeTruthy();
  });

  it('$$anyPath$$ can be the first thing in the path', function() {
    var rex = jt.regexFromPathPattern("/$$anyPath$$/lastName");
    expect("/lastName".match(rex)).toBeTruthy();
    expect("/user/lastName".match(rex)).toBeTruthy();
    expect("/user/bobby/lastName".match(rex)).toBeTruthy();
  });

  it('should match $$last$$ as is', function() {
    var rex = jt.regexFromPathPattern("/user/bobby/friends/$$last$$/name");
    // match
    expect("/user/bobby/friends/$$last$$/name".match(rex)).toBeTruthy();
    // no match
    expect("/user/bobby/friends/$$last$$".match(rex)).toBeFalsy();
    expect("/user/bobby/friends/$$last$$/another".match(rex)).toBeFalsy();
  });

  it('should match if $$anyPath$$ is last thing in the path', function() {
    var rex = jt.regexFromPathPattern("/$$anyPath$$");
    expect("/user/bobby/friends/$$last$$/name".match(rex)).toBeTruthy();
    expect("/user/bobby/lastName".match(rex)).toBeTruthy();
    expect("/lastName".match(rex)).toBeTruthy();
  });
});
