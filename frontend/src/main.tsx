import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "../src/context/AuthProvider";
import Home from "./pages/Home";
import SignIn from "./pages/Sign";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import ConfigDetail from "./pages/ConfigDetail";
import ProtectedRoute from "./pages/ProtectedRoute";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/config/:fileName" element={<ConfigDetail />} />
    </Route>
    </Route>
  )
);

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </>,
  // </StrictMode>
);