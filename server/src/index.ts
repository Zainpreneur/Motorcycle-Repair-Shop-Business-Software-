import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set. Set it in your .env file before deploying.");
}

const app = createApp();

app.listen(port, () => {
  console.log(`Motorcycle shop API listening on http://localhost:${port}`);
});
