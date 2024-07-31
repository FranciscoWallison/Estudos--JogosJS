const express = require("express");
const app = express();
const port = 3011;

app.use(express.static("."));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
