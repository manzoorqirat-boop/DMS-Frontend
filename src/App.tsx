import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppShell } from "@/app-shell/AppShell";
import { Dashboard } from "@/app-shell/Dashboard";
import { DocumentRegisterPage } from "@/features/documents/DocumentRegisterPage";
import { NewDocumentPage } from "@/features/documents/NewDocumentPage";
import { DocumentDetailPage } from "@/features/documents/DocumentDetailPage";
import { MyPendingSignaturesPage } from "@/features/documents/MyPendingSignaturesPage";
import { DocumentEditorPage } from "@/features/editing/DocumentEditorPage";
import { DocumentViewerPage } from "@/features/editing/DocumentViewerPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { ReviewDuePage } from "@/features/reports/ReviewDuePage";
import { DispositionDuePage } from "@/features/reports/DispositionDuePage";
import { PendingRetrievalPage } from "@/features/reports/PendingRetrievalPage";
import { OrganisationAdminPage } from "@/features/admin/OrganisationAdminPage";
import { TemplatesAdminPage } from "@/features/admin/TemplatesAdminPage";
import { UsersAdminPage } from "@/features/admin/UsersAdminPage";
import { RolesAdminPage } from "@/features/admin/RolesAdminPage";
import { WorkflowsAdminPage } from "@/features/admin/WorkflowsAdminPage";
import { MetadataFieldsAdminPage } from "@/features/admin/MetadataFieldsAdminPage";
import { NumberingRulesAdminPage } from "@/features/admin/NumberingRulesAdminPage";
import { PoliciesAdminPage } from "@/features/admin/PoliciesAdminPage";
import { NotificationRulesAdminPage } from "@/features/admin/NotificationRulesAdminPage";
import { JobsAdminPage } from "@/features/admin/JobsAdminPage";
import { ChangePasswordPage } from "@/features/settings/ChangePasswordPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />

              {/* Documents */}
              <Route path="/documents" element={<DocumentRegisterPage />} />
              <Route path="/documents/new" element={<NewDocumentPage />} />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/documents/:id/edit" element={<DocumentEditorPage />} />
              <Route path="/documents/:id/view" element={<DocumentViewerPage />} />
              <Route path="/my-signatures" element={<MyPendingSignaturesPage />} />

              {/* Worklists. Grouped under /reports to match the backend's own route group,
                  so a URL here maps predictably onto an API path. */}
              <Route path="/reports/review-due" element={<ReviewDuePage />} />
              <Route path="/reports/disposition-due" element={<DispositionDuePage />} />
              <Route path="/reports/pending-retrieval" element={<PendingRetrievalPage />} />

              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings/password" element={<ChangePasswordPage />} />

              {/* Administration. Organisation first: sites, departments and document
                  types are what every other admin screen scopes against. */}
              <Route path="/admin/organisation" element={<OrganisationAdminPage />} />
              <Route path="/admin/templates" element={<TemplatesAdminPage />} />
              <Route path="/admin/users" element={<UsersAdminPage />} />
              <Route path="/admin/roles" element={<RolesAdminPage />} />
              <Route path="/admin/workflows" element={<WorkflowsAdminPage />} />
              <Route path="/admin/metadata" element={<MetadataFieldsAdminPage />} />
              <Route path="/admin/numbering" element={<NumberingRulesAdminPage />} />
              <Route path="/admin/policies" element={<PoliciesAdminPage />} />
              <Route path="/admin/notification-rules" element={<NotificationRulesAdminPage />} />
              <Route path="/admin/jobs" element={<JobsAdminPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
