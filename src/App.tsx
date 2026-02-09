import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SignUp from "./pages/SignUp";
import GroupPage from "./pages/GroupPage";
import HealthRecordsDashboard from "./pages/HealthRecordsDashboard";
import VitalSignInputScreen from "./pages/VitalSignInputScreen";
import MealInputScreen from "./pages/MealInputScreen.tsx";
import ExcretionInputScreen from "./pages/ExcretionInputScreen.tsx";
import MedicationInputScreen from "./pages/MedicationInputScreen.tsx";
import BatchHealthInputScreen from "./pages/BatchHealthInputScreen";
import TaskList from "./pages/TaskList";
import SettingsScreen from "./pages/SettingsScreen";

import { SnackbarProvider } from "notistack";
import "./App.css"; // <-- ここでApp.cssをインポート
function App() {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Router>
        <Routes>
          {/* path="/" で SignUp コンポーネントを表示 /} */}
          <Route path="/" element={<SignUp />} />
          <Route path="/groups" element={<GroupPage />} />
          <Route path="/tasklist" element={<TaskList />} />
          <Route
            path="/health-records-dashboard"
            element={<HealthRecordsDashboard />}
          />
          <Route
            path="/health-records-dashboard/vital-sign/input"
            element={<VitalSignInputScreen />} // バイタルサインルート
          />
          <Route
            path="/health-records-dashboard/meal/input"
            element={<MealInputScreen />}
          />
          <Route
            path="/health-records-dashboard/excretion/input"
            element={<ExcretionInputScreen />}
          />
          <Route
            path="/health-records-dashboard/medication/input"
            element={<MedicationInputScreen />}
          />

          {/* ⭐ まとめて入力ルート */}
          <Route
            path="/health-records-dashboard/batch-input"
            element={<BatchHealthInputScreen />}
          />
          <Route path="/settings" element={<SettingsScreen />} />
          {/* {/ 他のページへのルートもここに追加 /} */}
          {/* <Route path="/home" element={<HomePage />} /> */}
        </Routes>
      </Router>
    </SnackbarProvider>
  );
}
export default App;
