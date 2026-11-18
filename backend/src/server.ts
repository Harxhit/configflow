import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT ;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`ConfigFlow API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

startServer();