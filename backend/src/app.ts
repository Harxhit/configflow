import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import axios from "axios";
import https from 'node:https'
import configRoutes from "./routes/config.routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);


app.use((request, response, next) => {
  const start = Date.now();

  console.log(
    `[REQUEST] ${request.method} ${request.originalUrl}`
  );

  response.on("finish", () => {
    console.log(
      `[RESPONSE] ${request.method} ${request.originalUrl} - ${response.statusCode} - ${Date.now() - start}ms`
    );
  });

  next();
});

axios.defaults.httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  keepAliveMsecs: 30000,
});

app.use("/api/auth", authRoutes);
app.use("/api/config", configRoutes);

app.get("/health", (_request, response) => {
  return response.status(200).json({
    success: true,
    message: "ConfigFlow API is running",
  });
});

export default app;