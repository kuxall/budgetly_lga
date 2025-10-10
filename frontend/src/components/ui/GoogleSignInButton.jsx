// Placeholder for GoogleSignInButton
// Replace with your actual implementation
import React from "react";

const GoogleSignInButton = ({ text, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
  >
    <span className="mr-2">G</span>
    {text || "Sign in with Google"}
  </button>
);

export default GoogleSignInButton;
