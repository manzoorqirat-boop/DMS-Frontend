import { useContext } from "react";
import { OrganisationDataContext, type OrganisationDataValue } from "@/features/organisation/OrganisationDataContext";

export function useOrganisationData(): OrganisationDataValue {
  const context = useContext(OrganisationDataContext);
  if (!context) {
    throw new Error("useOrganisationData must be used within an OrganisationDataProvider.");
  }
  return context;
}
