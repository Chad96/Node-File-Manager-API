// Importing necessary modules
const fs = require('fs');
const http = require('http');
const path = './data';

// Create 'data' directory if it doesn't exist
if (!fs.existsSync(path)) {
  fs.mkdirSync(path);
}

// Path to the shopping list JSON file
const filePath = `${path}/shoppingList.json`;

// Create 'shoppingList.json' if it doesn't exist
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, JSON.stringify([]));
}

// Function to read the shopping list JSON file
const readShoppingList = () => {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};

// Function to update the shopping list JSON file
const updateShoppingList = (newData) => {
  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
};

// Create an HTTP server
const server = http.createServer((req, res) => {
  // Handle GET request for the shopping list
  if (req.method === 'GET' && req.url === '/shopping-list') {
    const shoppingList = readShoppingList();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(shoppingList));
  } 
  // Handle POST request to add an item
  else if (req.method === 'POST' && req.url === '/shopping-list') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newItem = JSON.parse(body);
        if (!newItem.name || !newItem.quantity) {
          throw new Error('Missing required fields');
        }

        // Read existing shopping list
        const shoppingList = readShoppingList();
        
        // Generate a new ID
        const newId = shoppingList.length ? Math.max(...shoppingList.map(item => item.id)) + 1 : 1;

        // Add new item with the generated ID
        newItem.id = newId;
        shoppingList.push(newItem);
        updateShoppingList(shoppingList);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Item added', id: newId }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
  // Handle PUT request to update the entire item
  else if (req.method === 'PUT' && req.url.startsWith('/shopping-list/')) {
    const id = parseInt(req.url.split('/')[2]); // Ensure ID is a number
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updatedItem = JSON.parse(body);
        let shoppingList = readShoppingList();

        let itemFound = false;
        shoppingList = shoppingList.map(item => {
          if (item.id === id) {
            itemFound = true;
            return { ...item, ...updatedItem }; // Full update
          }
          return item;
        });

        if (itemFound) {
          updateShoppingList(shoppingList);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Item updated' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Item not found' }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
  // Handle PATCH request to partially update an item
  else if (req.method === 'PATCH' && req.url.startsWith('/shopping-list/')) {
    const id = parseInt(req.url.split('/')[2]); // Ensure ID is a number
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updatedFields = JSON.parse(body); // Fields to be updated
        let shoppingList = readShoppingList();

        let itemFound = false;
        shoppingList = shoppingList.map(item => {
          if (item.id === id) {
            itemFound = true;
            return { ...item, ...updatedFields }; // Merge only the updated fields
          }
          return item;
        });

        if (itemFound) {
          updateShoppingList(shoppingList);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Item updated partially' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Item not found' }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
  // Handle DELETE request to remove an item
  else if (req.method === 'DELETE' && req.url.startsWith('/shopping-list/')) {
    const id = parseInt(req.url.split('/')[2]); // Ensure ID is a number
    let shoppingList = readShoppingList();

    // Filter out the item with the matching ID
    const updatedList = shoppingList.filter(item => item.id !== id);

    if (shoppingList.length === updatedList.length) {
      // No item was found to delete (i.e., the list length didn't change)
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Item not found' }));
    } else {
      // Update the list and write to file
      updateShoppingList(updatedList);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Item deleted' }));
    }
  } 
  // Handle invalid routes
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Route not found' }));
  }
});

// Server listens on port 3000
server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
