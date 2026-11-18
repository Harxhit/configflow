import {comparePassword , hashPassword} from '../utils/password'
import {Response, Request} from 'express'
import { signInSchema, signUpSchema } from '../validators/auth.validator'
import { prisma } from "../lib/prisma";
import { generateAccessToken } from '../utils/jwt';
import crypto from "crypto";

const signIn = async (request: Request, response: Response) => {
  try {
    const { error, value } = signInSchema.validate(request.body);

    if (error) {
      return response.status(400).json({
        success: false,
        message: error.details[0].message,
        path: error.details[0].path,
      });
    }

    const { email, password } = value;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return response.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return response.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token =  generateAccessToken(user.id, user.tokenVersion)

    response.cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, 
        path: "/",
    });

    return response.status(200).json({
      success: true,
      message: "Sign in successful",
    });

  } catch (error) {
    console.error("SignIn error:", error);

    return response.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const signOut = async (request: Request, response: Response) => {
  try {
    await prisma.user.update({
      where: {
        id: request.user.id,
      },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    response.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response.status(200).json({
      success: true,
      message: "Sign out successful",
    });
  } catch (error) {
    console.error("SignOut error:", error);

    return response.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const signUp = async (request: Request, response: Response) => {
  try {
    const { error, value } = signUpSchema.validate(request.body);

    if (error) {
      return response.status(400).json({
        success: false,
        message: error.details[0].message,
        path: error.details[0].path,
      });
    }

    const { email, password } = value;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return response.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const username = `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    //We need to add check for  duplicate username 

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        password: hashedPassword,
      },
    });

    const token = generateAccessToken(user.id, user.tokenVersion);

    response.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    return response.status(201).json({
      success: true,
      message: "Account created successfully",
    });

  } catch (error) {
    console.error("SignUp error:", error);

    return response.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMe = async (request: Request, response: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: request.user.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return response.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return response.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: {
        user,
      },
    });

  } catch (error) {
    console.error("GetMe error:", error);

    return response.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {signIn, signOut, signUp, getMe}