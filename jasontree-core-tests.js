var jt = require('./jasontree-core.js');

describe('simple GET operation', function() {
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

  it('should get primitives', function() {
    var firstName = jt.get(this.tree, '/users/bobby/firstName');
    expect(firstName).toEqual('Bob');
  });

  it('should get objects', function() {
    var user = jt.get(this.tree, '/users/bobby');
    expect(user).toEqual({
      firstName: 'Bob'
    });
  });

  it('should get arrays', function() {
    var books = jt.get(this.tree, '/users/alice/books');
    expect(books).toEqual(['Alice in Wonderland']);
  });

  it('should be safe to access non-existent nodes', function() {
    var noSuchThing = jt.get(this.tree, '/no/such/path/in/this/tree');
    expect(noSuchThing).not.toBeDefined();
  });

  it('should accept path as an array of key names', function() {
    var books = jt.get(this.tree, ['users', 'alice', 'books']);
    expect(books).toEqual(['Alice in Wonderland']);
  });
});

describe('simple PUT operations', function() {
  beforeEach(function() {
    this.tree = jt.tree();
    this.getTree = function(path) {
      return jt.get(this.tree, path);
    };
  });

  it('should insert primitives', function() {
    jt.put(this.tree, '/users/bobby/firstName', 'Bob');
    expect(this.getTree('/users/bobby/firstName')).toEqual('Bob');
  });

  it('should insert objects', function() {
    jt.put(this.tree, '/users/bobby', {
      firstName: 'Bob'
    });
    expect(this.getTree('/users/bobby/firstName')).toEqual('Bob');
  });

  it('should insert arrays', function() {
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

  it('should insert primitive into root of the tree', function() {
    jt.put(this.tree, '/count', 5);
    expect(this.getTree('/count')).toEqual(5);
  });
});

describe('Generation of unique keys when inserting data', function() {
  it('should generate unique id for $$uuid$$ in path', function() {
    var tree = jt.put(jt.tree(), '/users/$$uuid$$', {
      firstName: 'Bob',
      lastName: 'Smith'
    });
    var userId = jt.lastPutPath(tree)[1];
    expect(userId).toBeDefined();
    expect(jt.get(tree, ['users', userId, 'firstName'])).toEqual('Bob');
  });

  it('can accept multiple $$uuid$$ in path', function() {
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

