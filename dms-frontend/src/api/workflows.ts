import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { CreateWorkflowRequest, WorkflowStepRequest, WorkflowView } from "@/types/workflows";

/** GET /api/workflows */
export function listWorkflows(documentTypeId?: string): Promise<WorkflowView[]> {
  return apiFetch<WorkflowView[]>(`/api/workflows${toQueryString({ documentTypeId })}`);
}

/** POST /api/workflows */
export function createWorkflow(request: CreateWorkflowRequest): Promise<WorkflowView> {
  return apiFetch<WorkflowView>("/api/workflows", { method: "POST", body: request });
}

/** PUT /api/workflows/{id}/steps */
export function setWorkflowSteps(id: string, steps: WorkflowStepRequest[]): Promise<WorkflowView> {
  return apiFetch<WorkflowView>(`/api/workflows/${id}/steps`, { method: "PUT", body: steps });
}

/** POST /api/workflows/{id}/activate */
export function activateWorkflow(id: string): Promise<WorkflowView> {
  return apiFetch<WorkflowView>(`/api/workflows/${id}/activate`, { method: "POST" });
}

/** POST /api/workflows/{id}/deactivate */
export function deactivateWorkflow(id: string): Promise<WorkflowView> {
  return apiFetch<WorkflowView>(`/api/workflows/${id}/deactivate`, { method: "POST" });
}
