**THIS IS A WORK IN PROGRESS**

# What?

JasonTree is a JSON document store that makes it easy to rapidly prototype a web app without having to create a backend.

This is an experiment. **Do not use this in production**.

JasonTree allows you store and retrieve data as JSON via a REST-like HTTP interface. Examples below use a simplified HTTP call notation for brevity.

This is a prototyping tool. It favors convenience and speed of development over performance, and convention over configuration.

Conceptually, all data stored in JasonTree is represented as one large JSON document. It can contain arbitrary objects, arrays and values (the use of those terms is consistent with the [http://json.org](JSON spec)).

## Store and retrieve JSON values

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

## RESTfully create new elements in collections

Following the [RESTful web services convention](https://en.wikipedia.org/wiki/Representational_state_transfer#Applied_to_web_services) you can use HTTP POST to insert new values into arrays. If you are inserting an object, it'll automatically set the "id" property to the index in the array:

```
> GET /users
< {"value": []}

> POST /users
> {"value": {"name": "John"}}
< {"value": {"id": 0, "name": "John"}}

> POST /users
> {"value": {"name": "Bob"}}
< {"value": {"id": 1, "name": "Bob"}}

> GET /users/1
< {"value": {"id": 1, "name": "Bob"}}

You can also use POST to insert new values into objects, in which case JasonTree will generate a UUID and use it as a key:

> GET /addresses
< {"value": {}}

> POST /addresses
> {"value": {"street": "100 Main st"}}
< {"value": {"id": "5D2F6DBE-5DF9-479D-9D03-34C74A48E9E3", "street": "100 Main st"}}

> POST /addresses
> {"value": {"street": "300 Nth ave"}}
< {"value": {"id": "98EBCB9A-6BE2-4889-BE9E-BD6880C191DF", "street": "300 Nth ave"}}

> GET /addresses
< {"value": {"98EBCB9A-6BE2-4889-BE9E-BD6880C191DF": {"id": "98EBCB9A-6BE2-4889-BE9E-BD6880C191DF", "street": "300 Nth ave"}, "5D2F6DBE-5DF9-479D-9D03-34C74A48E9E3": {"id": "5D2F6DBE-5DF9-479D-9D03-34C74A48E9E3", "street": "100 Main st"}}}

# Why?

- Because it should be possible to jump right in and focus on the interesting parts of the UI without having to worry about the boilerplate code that shuttles objects between the browser, the web server and the database
- Because what I often want is to shift as much of my web app logic as possible to the frontend and have a relatively dumb data store that just stores data
- Because most of the interactions with RESTful APIs are about moving data

# Can it do X?

Besides reading and writing data, web applications typically rely on other functionality implemented on the server:
- Assign unique identifiers to objects
- Trigger asynchronous processing of data
- Execute custom bits of logic
- Upload/download files
- Transform/augment/aggregate data supplied by the frontend

JasonTree has built-in support for some of these operations. It also gets out of your way when you need to implement your own.

## Assign unique identifiers to objects

## Asynchronously process data on the server

## Store files in the tree

## Implement custom operations

## Transform data

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
