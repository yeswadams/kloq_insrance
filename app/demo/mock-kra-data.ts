export const mockKraRecords = {
  P051234567A: { companyName: "Savannah Freight Services Ltd", status: "COMPLIANT", obligations: ["VAT", "PAYE", "Corporate Income Tax"], lastFiling: "Up to date" },
  P051234568B: { companyName: "Highland Produce Transport Ltd", status: "COMPLIANT", obligations: ["VAT", "PAYE", "Corporate Income Tax"], lastFiling: "Up to date" },
  P051234569C: { companyName: "Coastal Cold Chain Ltd", status: "NON_COMPLIANT", obligations: ["VAT", "PAYE", "Corporate Income Tax"], lastFiling: "VAT return overdue" },
  P051234570D: { companyName: "Mara Building Logistics Ltd", status: "COMPLIANT", obligations: ["VAT", "PAYE", "Corporate Income Tax"], lastFiling: "Up to date" },
  P051234571E: { companyName: "Equator Courier Network Ltd", status: "PENDING_REVIEW", obligations: ["VAT", "PAYE"], lastFiling: "Under review" },
} as const;
