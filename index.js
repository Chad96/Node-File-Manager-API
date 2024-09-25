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
        const shoppingList = readShoppingList();
        shoppingList.push(newItem);
        updateShoppingList(shoppingList);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Item added' }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
  // Handle PUT request to update an item
  else if (req.method === 'PUT' && req.url.startsWith('/shopping-list/')) {
    const id = req.url.split('/')[2];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updatedItem = JSON.parse(body);
        let shoppingList = readShoppingList();
        shoppingList = shoppingList.map(item => item.id === id ? updatedItem : item);
        updateShoppingList(shoppingList);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Item updated' }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
  // Handle DELETE request to remove an item
  else if (req.method === 'DELETE' && req.url.startsWith('/shopping-list/')) {
    const id = req.url.split('/')[2];
    let shoppingList = readShoppingList();
    shoppingList = shoppingList.filter(item => item.id !== id);
    updateShoppingList(shoppingList);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Item deleted' }));
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
