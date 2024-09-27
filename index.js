// Importing necessary modules
const fs = require('fs');
const http = require('http');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid'); // Import uuid for generating unique IDs
const path = './data';
const imagePath = './uploads';

// Create 'data' directory if it doesn't exist
if (!fs.existsSync(path)) {
  fs.mkdirSync(path);
}

// Create 'uploads' directory if it doesn't exist
if (!fs.existsSync(imagePath)) {
  fs.mkdirSync(imagePath);
}

// Path to the shopping list JSON file
const filePath = `${path}/shoppingList.json`;

// Create 'shoppingList.json' if it doesn't exist
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, JSON.stringify([]));
}

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagePath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Function to read the shopping list JSON file
const readShoppingList = () => {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};

// Function to update the shopping list JSON file
const updateShoppingList = (newData) => {
  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
};

// Function to delete an image file from the uploads directory
const deleteImageFile = (imageFileName) => {
  const filePath = `${imagePath}/${imageFileName}`;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath); // Delete the image file
  }
};

// Create an HTTP server
const server = http.createServer((req, res) => {
  // Serve static files (images)
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const filePath = `.${req.url}`; // Serve files from the uploads directory
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end(JSON.stringify({ message: 'File not found' }));
      }
      res.writeHead(200, { 'Content-Type': 'image/jpeg' }); // Adjust content type based on your image format
      res.end(data);
    });
    return;
  }

  // Handle GET request for the shopping list
  if (req.method === 'GET' && req.url === '/shopping-list') {
    const shoppingList = readShoppingList();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(shoppingList));
  }
  
  // Handle POST request to add an item with an image
  else if (req.method === 'POST' && req.url === '/shopping-list') {
    upload.single('image')(req, res, (err) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Image upload failed' }));
      }

      // Multer automatically processes the form data, req.body now contains fields.
      const { name, quantity } = req.body;

      // Ensure required fields are present
      if (!name || !quantity) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing required fields' }));
      }

      // Read existing shopping list
      const shoppingList = readShoppingList();

      // Create a new item with a unique ID
      const newItem = {
        id: uuidv4(),
        name,
        quantity,
        image: req.file ? req.file.filename : null // Save the uploaded image filename
      };

      // Add the new item to the list and update the file
      shoppingList.push(newItem);
      updateShoppingList(shoppingList);

      // Return the newly added item details
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Item added', id: newItem.id, image: newItem.image }));
    });
  }
  
  // Handle PUT request to update the entire item
  else if (req.method === 'PUT' && req.url.startsWith('/shopping-list/')) {
    const id = req.url.split('/')[2];
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
  
  // Handle DELETE request to remove an item
  else if (req.method === 'DELETE' && req.url.startsWith('/shopping-list/')) {
    const id = req.url.split('/')[2];
    
    let shoppingList = readShoppingList();
    const itemToDelete = shoppingList.find(item => item.id === id);

    if (!itemToDelete) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Item not found' }));
    } else {
      // Remove the item from the list
      const updatedList = shoppingList.filter(item => item.id !== id);
      updateShoppingList(updatedList);

      // If the item had an associated image, delete it from the uploads folder
      if (itemToDelete.image) {
        deleteImageFile(itemToDelete.image);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Item and associated image deleted' }));
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
