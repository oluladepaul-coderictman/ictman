import * as React from "react";
import { Redirect } from "wouter";

// Server config is no longer needed — this app is fully hosted on Replit.
export default function ServerConfigPage() {
  return <Redirect to="/super-admin/dashboard" />;
}
