# Advanced Routing

Beyond basic routes, NeoAPI offers tools to organize your routes and handle complex scenarios.

## Grouping Routes (`app.group`)

When you have multiple routes sharing a common path prefix (like `/api/v1/...`), `app.group()` helps organize them without repeating the prefix.

**Signature:** `app.group(prefix, callback)`

*   `prefix` (String): The common path prefix (e.g., `/api`, `/admin`, `/v1/users`). A leading slash is recommended but will be added if missing.
*   `callback` (Function): A function that receives the `app` instance as its argument. Define your routes *inside* this callback using the provided instance.

**Example:**

```javascript
// Routes without grouping
app.get('/api/v1/users', getAllUsers);
app.post('/api/v1/users', createUser);
app.get('/api/v1/users/:id', getUserById);
app.put('/api/v1/users/:id', updateUser);

app.get('/api/v1/products', getAllProducts);
app.post('/api/v1/products', createProduct);

// --- Equivalent routes using app.group ---

app.group('/api/v1', (v1) => {
  // Inside this callback, all paths are relative to '/api/v1'

  // User Routes (Mounted at /api/v1/users)
  v1.group('/users', (users) => {
      users.get('/', getAllUsers);       // -> GET /api/v1/users
      users.post('/', createUser);      // -> POST /api/v1/users
      users.get('/:id', getUserById); // -> GET /api/v1/users/:id
      users.put('/:id', updateUser);  // -> PUT /api/v1/users/:id
  });

  // Product Routes (Mounted at /api/v1/products)
  v1.group('/products', (products) => {
     products.get('/', getAllProducts);  // -> GET /api/v1/products
     products.post('/', createProduct); // -> POST /api/v1/products
  });

   // Route directly under /api/v1
   v1.get('/status', (req, res) => {     // -> GET /api/v1/status
        res.json({ status: 'v1 API is running' });
   });
});
```

Groups can be nested as shown above. This significantly improves readability and maintainability for larger APIs.

## Parallel Handlers (`app.parallel`)

Sometimes, a single API endpoint needs data from multiple independent sources (e.g., fetching user profile, recent orders, and notifications for a dashboard). Running these fetches sequentially can be slow. `app.parallel()` allows you to run multiple async handler functions concurrently and merges their results.

**Signature:** `app.parallel(handlerList)`

*   `handlerList` (Array<Function>): An array of async handler functions. Each function should:
    *   Accept `req` as its argument: `async (req) => { ... }`.
    *   Perform its asynchronous task (e.g., database query, external API call).
    *   Return an object containing the data it fetched, or `null`/`undefined` if it has no data to contribute.

**Returns:**

*   A single *new* handler function `async (req, res, next)` that orchestrates the parallel execution. You register *this returned function* with a route method (e.g., `app.get`).

**How it Works:**

1.  When a request hits the route registered with the parallel handler, `app.parallel` invokes all functions in `handlerList` concurrently using `Promise.all()`.
2.  It waits for all promises to *settle* (either resolve or reject).
3.  It collects the resolved values (which should be objects).
4.  It performs a **shallow merge** of all the returned objects into a single result object.
5.  It sends this merged object as the JSON response.
6.  **Error Handling:** If any individual handler in the list rejects its promise, `app.parallel` catches the error, logs it, but *does not* stop the other handlers. The final merged result will simply omit the data from the failed handler(s). If a critical error occurs in the orchestration itself, it calls `next(err)`.

**Example:**

```javascript
// Define individual async data-fetching functions
async function fetchUserProfile(req) {
  console.log('Fetching profile...');
  // const profile = await db.users.findById(req.user.id);
  await new Promise(r => setTimeout(r, 100)); // Simulate DB call
  return { profile: { name: 'Alice', email: 'alice@example.com' } };
}

async function fetchRecentOrders(req) {
  console.log('Fetching orders...');
  // const orders = await db.orders.find({ userId: req.user.id }).limit(5);
   await new Promise(r => setTimeout(r, 150));
  return { recentOrders: [{ id: 'o1', total: 50 }, { id: 'o2', total: 75 }] };
}

async function fetchNotifications(req) {
    console.log('Fetching notifications...');
    await new Promise(r => setTimeout(r, 80));
    // Simulate failure
    // throw new Error("Notification service unavailable");
    return { notificationCount: 3 };
}

// Register a route using app.parallel with the list of functions
app.get('/dashboard', app.parallel([
  fetchUserProfile,
  fetchRecentOrders,
  fetchNotifications
]));

// When a GET request is made to /dashboard:
// 1. fetchUserProfile, fetchRecentOrders, fetchNotifications run concurrently.
// 2. NeoAPI waits for all three to finish.
// 3. The results are merged:
//    {
//      profile: { name: 'Alice', email: 'alice@example.com' },
//      recentOrders: [ { id: 'o1', total: 50 }, { id: 'o2', total: 75 } ],
//      notificationCount: 3
//    }
// 4. This merged object is sent as the JSON response.
// (If fetchNotifications had failed, the response would omit `notificationCount` and a warning logged)
```

This pattern is extremely useful for optimizing I/O-bound endpoints that aggregate data from multiple sources.