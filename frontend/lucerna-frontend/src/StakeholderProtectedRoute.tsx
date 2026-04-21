import React from "react";
import { Navigate } from "react-router-dom";
import { useStakeholderAuth } from "./StakeholderAuthContext";
import { JSX } from "react/jsx-runtime";
import AppTheme from "./shared-ui-theme/AppTheme";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";

interface StakeholderProtectedRouteProps {
  children: JSX.Element;
}

const StakeholderProtectedRoute: React.FC<StakeholderProtectedRouteProps> = ({
  children,
}) => {
  const { stakeholder, isLoading } = useStakeholderAuth();

  if (isLoading) {
    return (
      <AppTheme>
        <CssBaseline enableColorScheme />
        <Box
          sx={{
            height: "100vh",
            width: "100vw",
            backgroundColor: "background.default",
          }}
        />
      </AppTheme>
    );
  }

  if (!stakeholder) {
    return <Navigate to="/stakeholder-login" replace />;
  }

  return children;
};

export default StakeholderProtectedRoute;
