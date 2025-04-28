const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
}); 