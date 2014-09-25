JasonTree is a JSON document store that makes it easy to rapidly prototype web application backends in development.

Data is stored and retrieved as JSON via a REST-like HTTP interface. Examples below use a simplified HTTP call notation for brevity.

Conceptually, all data stored in JasonTree is represented as one large JSON document. It can contain arbitrary objects, arrays and values (the use of those terms is consistent with the JSON spec found on http://json.org).

Right out of the box, JasonTree allows you to PUT and GET JSON objects, arrays and values:

```
> PUT /users/bobby
> {"value": {"name": "Bob", "age": 40, "friends": [{"name": "Alice"}, {"name": "John"}]}}

> GET /users/bobby
< {"value": {"name": "Bob", "age": 40, "friends": [{"name": "Alice"}, {"name": "John"}]}}
```

Data can be written to or retrieved from any path in the tree:

```
> PUT /users/bobby
> {"value": {"name": "Bob", "age": 40, "friends": [{"name": "Alice"}, {"name": "John"}]}}

> GET /users/bobby/age
< {"value": 40}

> GET /users/bobby/friends
< {"value": [{"name": "Alice"}, {"name": "John"}]}
```

Array indicies can be used as path elements:

```
> GET /users/bobby/friends/0/name
< {"value": "Alice"}
```

Non-existent tree nodes are created automatically when data is inserted into them:

```
> GET /users/john
< {"value": null}

> PUT /users/john/name
> {"value": "John"}

> GET /users/john
< {"value": {"name": "John"}}
```

