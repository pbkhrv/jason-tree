**THIS IS A WORK IN PROGRESS**

# What is JasonTree?

It is a JSON document store that makes it easy to rapidly prototype a web app without having to create a backend. It allows you store and retrieve data as JSON via a REST-like HTTP interface.

It is an experiment. **Do not use this in production**.

It is an attempt to create a web application backend that favors convenience and speed of development over flexibility, and convention over configuration.

It is an exploration of an idea. Not all of the features described in this README have been implemented yet.

Conceptually, all of the data stored in JasonTree is represented as one large JSON document called a 'tree'. It can contain arbitrary objects, arrays and values (the use of those terms is consistent with the [http://json.org](JSON spec)). Different parts of the tree can be accessed using 'paths' that look like file system paths.

Let's jump right in and see what JasonTree can do.


# Examples

## Store and retrieve JSON values

*Examples below use a simplified HTTP call notation for brevity. Strings starting with '>' refer to data being sent to the server. Strings starting with '<' depict data received from the server. To keep examples simple, we assume that the base URL is '/', but you can change that.*

Right out of the box, JasonTree allows you to PUT and GET values:

```
> PUT /users/bobby
> {"value": {"name": "Bob", "age": 40, "friends": [{"name": "Alice"}, {"name": "John"}]}}

> GET /users/bobby
< {"value": {"name": "Bob", "age": 40, "friends": [{"name": "Alice"}, {"name": "John"}]}}
```

Data can be written to or retrieved from anywhere in the tree based on the path specified in the URL.

```
> PUT /users/bobby
> {"value": {"name": "Bob", "age": 40, "friends": [{"name": "Alice"}, {"name": "John"}]}}

> GET /users/bobby/age
< {"value": 40}

> GET /users/bobby/friends
< {"value": [{"name": "Alice"}, {"name": "John"}, {"name": "Sara"}]}
```

## Access both arrays and objects

Array indicies can be used as URL path elements:

```
> GET /users/bobby/friends/0/name
< {"value": "Alice"}
```

## Tree nodes are created on the fly

Non-existent tree nodes are created automatically when necessary:

```
> GET /users/john
< {"value": null}

> PUT /users/john/name
> {"value": "John"}

> GET /users/john
< {"value": {"name": "John"}}
```

## RESTfully add elements to collections

Following the [RESTful web services convention](https://en.wikipedia.org/wiki/Representational_state_transfer#Applied_to_web_services) you can use HTTP POST to insert new values into arrays. If you are inserting an object, it'll automatically set the "id" property to the index in the array:

```
> PUT /users
> {"value": []}

> POST /users
> {"value": {"name": "John"}}
< {"value": {"id": 0, "name": "John"}}

> POST /users
> {"value": {"name": "Bob"}}
< {"value": {"id": 1, "name": "Bob"}}

> GET /users/1
< {"value": {"id": 1, "name": "Bob"}}
```

You can also use POST to insert new values into objects, in which case JasonTree will generate a UUID and use it as a key:

```
> PUT /addresses
> {"value": {}}

> POST /addresses
> {"value": {"street": "100 Main st"}}
< {"value": {"id": "5D2F6DBE-5DF9-479D-9D03-34C74A48E9E3", "street": "100 Main st"}}

> POST /addresses
> {"value": {"street": "300 Nth ave"}}
< {"value": {"id": "98EBCB9A-6BE2-4889-BE9E-BD6880C191DF", "street": "300 Nth ave"}}

> GET /addresses
< {"value": {"98EBCB9A-6BE2-4889-BE9E-BD6880C191DF": {"id": "98EBCB9A-6BE2-4889-BE9E-BD6880C191DF", "street": "300 Nth ave"}, "5D2F6DBE-5DF9-479D-9D03-34C74A48E9E3": {"id": "5D2F6DBE-5DF9-479D-9D03-34C74A48E9E3", "street": "100 Main st"}}}
```


# How is the data stored?

As of right now, all of the data resides in one process memory space, but if this idea survives and mature implementations arise, they can choose to store data in whatever way makes most sense from reliability/scalability/availability/performance perspective: in databases, on disk, sharded on different servers etc.

The tree data structure is implemented in JavaScript, is separate from the HTTP server and can be used by itself, even in the browser.


# Goals and principles

- Reduce amount of boilerplate code you have to write during the web application prototyping phase
- Eliminate the need to bring up a database while prototyping
- Allow the developer to easily manipulate the data on the server

I'd like JasonTree to follow these best practices as much as possible:
- Use events to process data
- Favor immutability
- Favor declarative and functional coding styles, especially when it comes to complex tasks such as data manipulation


# The story behind JasonTree

I was prototyping a couple of single-page web applications that needed to store and retrieve some data from the server. I was mostly interested in getting the UI to the point where it could be demo'ed and discussed. Keeping the data models clean and organized wasn't important, since the whole thing was meant to be thrown out and rewritten anyway. I wanted to keep the backend as light as possible, preferably without databases. I also wanted it to be hosted locally on my laptop, in order to be able to give demoes without an Internet connection.

Little by little, I arrived at the idea of storing all of my data in one large associative array on the server and accessing it via HTTP and JSON. It was simple to use and understand. That's how JasonTree was born. It is still highly experimental and I'd love to get your feedback and input.


# Can it do X?

Besides reading and writing data, web applications typically rely on other functionality implemented on the server:
- Transform data
- Create dynamic "views" of data
- Assign unique identifiers to objects
- Trigger asynchronous processing of data
- Execute custom bits of logic
- Upload/download files

JasonTree has built-in support for some of these operations. It also gets out of your way when you need to implement your own.

## Mutate data/create data views (NOT IMPLEMENTED YET)

JasonTree server uses a core data structure to store data that you can customize to fit your needs. One of the features of this tree data structure is an ability to define data mutations and dynamic views.

You can tell the tree to automatically insert values into objects whenever those objects are created. This is useful for storing time stamps or any other information related to object creation:

    tree.put('/users/$$anyKey$$/createdAt', function() { return Date.now(); });

In the following example, every user object will automatically have a boolean property named 'is_friends_with_andy' set to true or false depending on whether or not there is an object in the 'friends' array with a property called 'name' set to 'Andy'. `tree.values()` returns a list of map or array values wrapped as a [Lazy.js sequence](http://danieltao.com/lazy.js/docs/#Lazy)). `_.partial()` and `_.isEqual()` are convenient [Lo-Dash](https://lodash.com/) functions.

```
JavaScript, during server initialization:

tree.view('/users/$$anyKey$$/is_friends_with_andy', function(user) {
  return user.values('friends').pluck('name').some(_.partial(_.isEqual, 'Andy'));
});


Client interacting with the JasonTree server:

> PUT /users/bobby
> {"value": {"name": "Bob", "age": 40, "friends": [{"name": "Alice"}, {"name": "John"}]}}

> GET /users/bobby
< {"value": {"name": "Bob", "age": 40, "is_friends_with_andy": false, "friends": [{"name": "Alice"}, {"name": "John"}]}}
```

Below is an example of a view that gives you access to the last 10 created users, in reverse chronological order, based on a user object property called 'createdAt'. Note the use of chained methods on the lazy sequence returned by `tree.values()`.

    tree.view('/last_10_users', tree.values('/users/$$anyKey$$').sortBy(_.property('createdAt')).reverse().take(10));

## Asynchronously process data on the server

## Store files in the tree (NOT IMPLEMENTED YET)

## Implement custom operations

# License

Copyright (C) 2014 Peter Bakhirev

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
