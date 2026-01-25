const express = require('express');
const Redis = require('ioredis');

const app = express();
const redis = new Redis();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
