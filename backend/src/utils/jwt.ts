import jwt from "jsonwebtoken";

const generateAccessToken = (userId: string, tokenVersion: number) => {
  return jwt.sign({ userId, tokenVersion }, process.env.JWT_SECRET!, { expiresIn: "1d" });
};

const verifyAccessToken = (token:string) => {
  return jwt.verify(token, process.env.JWT_SECRET!)
}

export {generateAccessToken, verifyAccessToken}