import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center h-screen bg-gray-100">
              <h1 className="text-3xl font-bold text-blue-600">Welcome to Budgetly!</h1>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
