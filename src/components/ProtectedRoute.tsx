// src/components/ProtectedRoute.tsx (新規作成)
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children?: React.ReactNode; // childrenを許可
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>; // 認証状態のロード中はローディング表示
  }

  if (!currentUser) {
    // ログインしていなければログイン/サインアップページへリダイレクト
    return <Navigate to="/auth" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
